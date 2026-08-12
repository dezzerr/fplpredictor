CREATE TABLE public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'welcome',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, template)
);

CREATE INDEX email_outbox_pending_jobs_idx
  ON public.email_outbox (available_at, created_at)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_outbox FROM anon, authenticated;
GRANT ALL ON TABLE public.email_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.set_email_outbox_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER email_outbox_updated_at
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.set_email_outbox_updated_at();

CREATE OR REPLACE FUNCTION public.queue_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Email/password users are queued only after confirmation. OAuth users whose
  -- provider has already confirmed the address are queued at creation.
  IF NEW.email IS NOT NULL
    AND NEW.email_confirmed_at IS NOT NULL
    AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
    INSERT INTO public.email_outbox (user_id, recipient_email, template)
    VALUES (NEW.id, NEW.email, 'welcome')
    ON CONFLICT (user_id, template) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_welcome_email() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_welcome_email() TO supabase_auth_admin;

CREATE TRIGGER on_auth_user_confirmed_queue_welcome_email
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_welcome_email();

CREATE OR REPLACE FUNCTION public.claim_email_outbox_jobs(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.email_outbox
    WHERE (
      status = 'pending' AND available_at <= NOW()
    ) OR (
      status = 'processing' AND locked_at < NOW() - INTERVAL '10 minutes'
    )
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ), claimed AS (
    UPDATE public.email_outbox AS outbox
    SET
      status = 'processing',
      attempt_count = outbox.attempt_count + 1,
      locked_at = NOW(),
      updated_at = NOW()
    FROM candidates
    WHERE outbox.id = candidates.id
    RETURNING outbox.*
  )
  SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_email_outbox_jobs(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_outbox_jobs(INTEGER) TO service_role;
