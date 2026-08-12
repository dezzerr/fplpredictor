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
