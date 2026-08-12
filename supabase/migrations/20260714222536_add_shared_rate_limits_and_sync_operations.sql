CREATE TABLE IF NOT EXISTS api_rate_limits (
  scope TEXT NOT NULL,
  rate_key TEXT NOT NULL,
  window_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (scope, rate_key)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_expires_at_idx ON api_rate_limits(expires_at);
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_api_rate_limit(
  p_scope TEXT,
  p_rate_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE(allowed BOOLEAN, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_time TIMESTAMP WITH TIME ZONE := NOW();
  current_count INTEGER;
  current_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Rate limit and window must be positive';
  END IF;

  INSERT INTO api_rate_limits (scope, rate_key, window_started_at, request_count, expires_at)
  VALUES (p_scope, p_rate_key, v_current_time, 1, v_current_time + make_interval(secs => p_window_seconds))
  ON CONFLICT (scope, rate_key) DO UPDATE
  SET
    window_started_at = CASE WHEN api_rate_limits.expires_at <= v_current_time THEN v_current_time ELSE api_rate_limits.window_started_at END,
    request_count = CASE WHEN api_rate_limits.expires_at <= v_current_time THEN 1 ELSE api_rate_limits.request_count + 1 END,
    expires_at = CASE WHEN api_rate_limits.expires_at <= v_current_time THEN v_current_time + make_interval(secs => p_window_seconds) ELSE api_rate_limits.expires_at END
  RETURNING request_count, expires_at INTO current_count, current_expiry;

  RETURN QUERY SELECT current_count <= p_limit, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (current_expiry - v_current_time)))::INTEGER);
END;
$$;

REVOKE ALL ON FUNCTION consume_api_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_api_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

CREATE TABLE IF NOT EXISTS fpl_sync_operations (
  operation_id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  manager_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('transfers', 'chips', 'combined')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'unknown')),
  event_id INTEGER,
  summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fpl_sync_operations_user_id_idx ON fpl_sync_operations(user_id, created_at DESC);
ALTER TABLE fpl_sync_operations ENABLE ROW LEVEL SECURITY;

ALTER TABLE fpl_sync_audit ADD COLUMN IF NOT EXISTS operation_id UUID REFERENCES fpl_sync_operations(operation_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS fpl_sync_audit_operation_id_idx ON fpl_sync_audit(operation_id);
