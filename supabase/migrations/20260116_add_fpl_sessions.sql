-- Migration: Add FPL Sessions table for direct FPL authentication
-- Run this migration to enable FPL direct login functionality

-- Create fpl_sessions table for storing FPL authentication sessions
CREATE TABLE IF NOT EXISTS fpl_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  manager_id INTEGER NOT NULL,
  encrypted_cookies TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fpl_sessions
CREATE INDEX IF NOT EXISTS fpl_sessions_user_id_idx ON fpl_sessions(user_id);
CREATE INDEX IF NOT EXISTS fpl_sessions_expires_at_idx ON fpl_sessions(expires_at);

-- Enable RLS for fpl_sessions
ALTER TABLE fpl_sessions ENABLE ROW LEVEL SECURITY;

-- FPL sessions policies (drop if exists to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own fpl session" ON fpl_sessions;
DROP POLICY IF EXISTS "Users can insert own fpl session" ON fpl_sessions;
DROP POLICY IF EXISTS "Users can update own fpl session" ON fpl_sessions;
DROP POLICY IF EXISTS "Users can delete own fpl session" ON fpl_sessions;

CREATE POLICY "Users can view own fpl session"
  ON fpl_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fpl session"
  ON fpl_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fpl session"
  ON fpl_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fpl session"
  ON fpl_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at (drop if exists to avoid conflicts)
DROP TRIGGER IF EXISTS fpl_sessions_updated_at ON fpl_sessions;

CREATE TRIGGER fpl_sessions_updated_at
  BEFORE UPDATE ON fpl_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
