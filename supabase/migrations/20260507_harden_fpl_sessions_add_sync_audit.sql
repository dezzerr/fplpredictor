ALTER TABLE fpl_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own fpl session" ON fpl_sessions;
DROP POLICY IF EXISTS "Users can insert own fpl session" ON fpl_sessions;
DROP POLICY IF EXISTS "Users can update own fpl session" ON fpl_sessions;
DROP POLICY IF EXISTS "Users can delete own fpl session" ON fpl_sessions;

ALTER TABLE fpl_sessions
  ALTER COLUMN encrypted_cookies SET NOT NULL;

CREATE TABLE IF NOT EXISTS fpl_sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  manager_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  event_id INTEGER,
  summary JSONB,
  status_code INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fpl_sync_audit_user_id_idx ON fpl_sync_audit(user_id);
CREATE INDEX IF NOT EXISTS fpl_sync_audit_created_at_idx ON fpl_sync_audit(created_at);

ALTER TABLE fpl_sync_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own fpl sync audit" ON fpl_sync_audit;

CREATE POLICY "Users can view own fpl sync audit"
  ON fpl_sync_audit FOR SELECT
  USING (auth.uid() = user_id);
