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
