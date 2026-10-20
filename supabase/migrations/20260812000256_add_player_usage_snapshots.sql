-- Server-only cumulative FPL usage observations used by usage-v2.
CREATE TABLE public.player_usage_snapshots (
  season_key TEXT NOT NULL,
  completed_gameweek INTEGER NOT NULL CHECK (completed_gameweek BETWEEN 0 AND 38),
  player_id TEXT NOT NULL,
  team TEXT NOT NULL,
  team_matches_played INTEGER NOT NULL CHECK (team_matches_played BETWEEN 0 AND 60),
  starts_total INTEGER NOT NULL CHECK (starts_total >= 0),
  minutes_total INTEGER NOT NULL CHECK (minutes_total >= 0),
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_key, completed_gameweek, player_id)
);

CREATE INDEX player_usage_snapshots_season_gameweek_idx
  ON public.player_usage_snapshots (season_key, completed_gameweek DESC);

ALTER TABLE public.player_usage_snapshots ENABLE ROW LEVEL SECURITY;

-- Operational data is only read and written by server code using the service
-- role. No anon or authenticated RLS policies are intentionally created.
REVOKE ALL ON TABLE public.player_usage_snapshots FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.player_usage_snapshots TO service_role;
