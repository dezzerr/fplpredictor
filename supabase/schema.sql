-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  fpl_team_id INTEGER UNIQUE,
  username TEXT,
  email TEXT,
  preset TEXT DEFAULT 'baseline' CHECK (preset IN ('conservative', 'baseline', 'aggressive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create squads table
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

-- Create squad_history table
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

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, player_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS squads_user_id_idx ON squads(user_id);
CREATE INDEX IF NOT EXISTS squads_is_active_idx ON squads(is_active);
CREATE INDEX IF NOT EXISTS squad_history_user_id_idx ON squad_history(user_id);
CREATE INDEX IF NOT EXISTS squad_history_gameweek_idx ON squad_history(gameweek);
CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON watchlist(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Squads policies
CREATE POLICY "Users can view own squads"
  ON squads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own squads"
  ON squads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own squads"
  ON squads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own squads"
  ON squads FOR DELETE
  USING (auth.uid() = user_id);

-- Squad history policies
CREATE POLICY "Users can view own squad history"
  ON squad_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own squad history"
  ON squad_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Watchlist policies
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist"
  ON watchlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);

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

-- Create index for fpl_sessions
CREATE INDEX IF NOT EXISTS fpl_sessions_user_id_idx ON fpl_sessions(user_id);
CREATE INDEX IF NOT EXISTS fpl_sessions_expires_at_idx ON fpl_sessions(expires_at);

-- Enable RLS for fpl_sessions
ALTER TABLE fpl_sessions ENABLE ROW LEVEL SECURITY;

-- FPL sessions policies
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

-- Create player_signals table for AI-extracted news/sentiment signals
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

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
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

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
