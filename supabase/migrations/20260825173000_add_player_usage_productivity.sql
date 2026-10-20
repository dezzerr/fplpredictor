-- Preserve prior-season scoring evidence across FPL's annual counter reset.
ALTER TABLE public.player_usage_snapshots
  ADD COLUMN IF NOT EXISTS total_points INTEGER CHECK (total_points >= 0),
  ADD COLUMN IF NOT EXISTS points_per_appearance NUMERIC(6, 2) CHECK (points_per_appearance >= 0);

-- Keep this operational table server-only under the current Data API grants.
REVOKE ALL ON TABLE public.player_usage_snapshots FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.player_usage_snapshots TO service_role;
