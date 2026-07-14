-- The original player-signals migration predated the server-only access model.
-- Existing environments must receive this separately.
ALTER TABLE public.player_signals ENABLE ROW LEVEL SECURITY;
