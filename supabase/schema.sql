-- ============================================================
-- Core tables
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  fpl_team_id INTEGER UNIQUE,
  username TEXT,
  email TEXT,
  preset TEXT DEFAULT 'baseline' CHECK (preset IN ('conservative', 'baseline', 'aggressive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  squad_data JSONB NOT NULL,
  bank DECIMAL(4,1) DEFAULT 0 CHECK (bank >= 0 AND bank <= 100),
  gameweek INTEGER,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  squad_data JSONB NOT NULL,
  predicted_points DECIMAL(5,1),
  actual_points DECIMAL(5,1),
  team_rating INTEGER CHECK (team_rating >= 0 AND team_rating <= 100),
  gw_rating INTEGER CHECK (gw_rating >= 0 AND gw_rating <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gameweek)
);

CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, player_id)
);

-- ============================================================
-- FPL sessions table
-- Intentionally service-role only.
-- No client RLS policies should be created for this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS fpl_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  manager_id INTEGER NOT NULL,
  encrypted_cookies TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- FPL sync audit table
-- Users can view their own sync audit records.
-- Backend/service role can insert audit records.
-- ============================================================

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
  operation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

ALTER TABLE fpl_sync_audit ADD COLUMN IF NOT EXISTS operation_id UUID;
ALTER TABLE fpl_sync_audit DROP CONSTRAINT IF EXISTS fpl_sync_audit_operation_id_fkey;
ALTER TABLE fpl_sync_audit
  ADD CONSTRAINT fpl_sync_audit_operation_id_fkey
  FOREIGN KEY (operation_id) REFERENCES fpl_sync_operations(operation_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS api_rate_limits (
  scope TEXT NOT NULL,
  rate_key TEXT NOT NULL,
  window_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (scope, rate_key)
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS squads_user_id_idx ON squads(user_id);
CREATE INDEX IF NOT EXISTS squads_is_active_idx ON squads(is_active);

CREATE INDEX IF NOT EXISTS squad_history_user_id_idx ON squad_history(user_id);
CREATE INDEX IF NOT EXISTS squad_history_gameweek_idx ON squad_history(gameweek);

CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON watchlist(user_id);

CREATE INDEX IF NOT EXISTS fpl_sessions_user_id_idx ON fpl_sessions(user_id);
CREATE INDEX IF NOT EXISTS fpl_sessions_expires_at_idx ON fpl_sessions(expires_at);

CREATE INDEX IF NOT EXISTS fpl_sync_audit_user_id_idx ON fpl_sync_audit(user_id);
CREATE INDEX IF NOT EXISTS fpl_sync_audit_created_at_idx ON fpl_sync_audit(created_at);
CREATE INDEX IF NOT EXISTS fpl_sync_audit_operation_id_idx ON fpl_sync_audit(operation_id);
CREATE INDEX IF NOT EXISTS fpl_sync_operations_user_id_idx ON fpl_sync_operations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS api_rate_limits_expires_at_idx ON api_rate_limits(expires_at);

-- ============================================================
-- Enable Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE fpl_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fpl_sync_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE fpl_sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Drop existing policies to make migration rerunnable
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own squads" ON squads;
DROP POLICY IF EXISTS "Users can insert own squads" ON squads;
DROP POLICY IF EXISTS "Users can update own squads" ON squads;
DROP POLICY IF EXISTS "Users can delete own squads" ON squads;

DROP POLICY IF EXISTS "Users can view own squad history" ON squad_history;
DROP POLICY IF EXISTS "Users can insert own squad history" ON squad_history;

DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can insert own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can update own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can delete own watchlist" ON watchlist;

-- Intentionally remove all client access to fpl_sessions.
DROP POLICY IF EXISTS "Users can view own fpl session" ON fpl_sessions;
DROP POLICY IF EXISTS "Users can insert own fpl session" ON fpl_sessions;
DROP POLICY IF EXISTS "Users can update own fpl session" ON fpl_sessions;
DROP POLICY IF EXISTS "Users can delete own fpl session" ON fpl_sessions;

DROP POLICY IF EXISTS "Users can view own fpl sync audit" ON fpl_sync_audit;

-- ============================================================
-- Profiles policies
-- ============================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- Squads policies
-- ============================================================

CREATE POLICY "Users can view own squads"
  ON squads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own squads"
  ON squads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own squads"
  ON squads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own squads"
  ON squads FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Squad history policies
-- ============================================================

CREATE POLICY "Users can view own squad history"
  ON squad_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own squad history"
  ON squad_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Watchlist policies
-- ============================================================

CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist"
  ON watchlist FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- FPL sessions policies
-- None by design.
--
-- fpl_sessions contains encrypted cookies.
-- Client users should not be able to SELECT, INSERT, UPDATE, or DELETE.
-- Backend service role can still access this table because it bypasses RLS.
-- ============================================================

ALTER TABLE fpl_sessions
  ALTER COLUMN encrypted_cookies SET NOT NULL;

-- ============================================================
-- FPL sync audit policies
-- ============================================================

CREATE POLICY "Users can view own fpl sync audit"
  ON fpl_sync_audit FOR SELECT
  USING (auth.uid() = user_id);

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

-- ============================================================
-- updated_at helper function
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers first to make migration rerunnable
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS squads_updated_at ON squads;
DROP TRIGGER IF EXISTS fpl_sessions_updated_at ON fpl_sessions;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER squads_updated_at
  BEFORE UPDATE ON squads
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER fpl_sessions_updated_at
  BEFORE UPDATE ON fpl_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- Automatically create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Player signals table for AI-extracted news/sentiment signals
-- ============================================================

CREATE TABLE IF NOT EXISTS player_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  player_id TEXT,
  team TEXT NOT NULL,
  gameweek INTEGER NOT NULL,
  signal TEXT NOT NULL,
  adjustment DECIMAL(4,3),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  reason TEXT,
  source_type TEXT CHECK (source_type IN ('youtube', 'article', 'twitter')),
  source_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_name, team, gameweek, signal)
);

CREATE INDEX IF NOT EXISTS player_signals_gameweek_idx ON player_signals(gameweek);
CREATE INDEX IF NOT EXISTS player_signals_player_id_idx ON player_signals(player_id);
