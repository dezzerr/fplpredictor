-- Keep historical squads while isolating live FPL data by season.
ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS season_key TEXT;

UPDATE public.squads
SET season_key = 'legacy'
WHERE season_key IS NULL;

ALTER TABLE public.squads
  ALTER COLUMN season_key SET DEFAULT 'legacy',
  ALTER COLUMN season_key SET NOT NULL;

ALTER TABLE public.squad_history
  ADD COLUMN IF NOT EXISTS season_key TEXT;

UPDATE public.squad_history
SET season_key = 'legacy'
WHERE season_key IS NULL;

ALTER TABLE public.squad_history
  ALTER COLUMN season_key SET DEFAULT 'legacy',
  ALTER COLUMN season_key SET NOT NULL;

ALTER TABLE public.squad_history
  DROP CONSTRAINT IF EXISTS squad_history_user_id_gameweek_key;

ALTER TABLE public.squad_history
  ADD CONSTRAINT squad_history_user_id_season_key_gameweek_key
  UNIQUE (user_id, season_key, gameweek);

CREATE INDEX IF NOT EXISTS squads_user_id_season_key_idx
  ON public.squads (user_id, season_key, gameweek DESC);
CREATE INDEX IF NOT EXISTS squad_history_user_id_season_key_idx
  ON public.squad_history (user_id, season_key, gameweek DESC);
