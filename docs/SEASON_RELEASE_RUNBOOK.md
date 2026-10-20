# FPL season release runbook

## Before deployment

1. Set `FPL_HEALTH_ALERT_EMAIL` and `FPL_HEALTH_APP_URL` (the production site URL) in Netlify Functions for the production context. The existing `SENDER_API_TOKEN`, `SENDER_FROM_EMAIL`, and `SENDER_FROM_NAME` values must remain server-side only.
2. Run `npm test`, `npm run typecheck`, and `npm run build`.
3. Confirm the official FPL bootstrap contains the expected 20 clubs and the players API returns the same season key in `X-FPL-Season-Key`.

## Preview validation

Deploy the release commit to a Netlify preview. Test against the preview URL:

1. Search for players and open player details; confirm team, price, ownership, availability flag, fixtures, and transfer metrics are live.
2. Open the fixture matrix and mobile add-player/transfer filters; confirm the current clubs, including Coventry, Hull, and Ipswich, appear and relegated clubs do not.
3. Use the transfer and add-player flows, then view recommendations; confirm prices and clubs agree with official FPL data.
4. Import a valid FPL Team ID and verify its squad is shown from the current official universe.
5. Load a saved current-season squad. Confirm a previous-season browser squad is cleared and cannot be loaded as the current season.

## Production promotion and monitoring

1. Promote the verified preview commit to production; do not rebuild a different commit.
2. Trigger the `fpl-data-health` function once from the Netlify dashboard. Confirm it logs an `OK` result with the current season key.
3. In a preview-only or temporary environment, point the health check at an invalid app URL and invoke it once. Confirm the configured operator receives the failure email, then remove the temporary setting.

The daily Netlify `fpl-data-health` job is read-only. It validates the official bootstrap and fixtures feeds plus the deployed `/api/players` and `/api/fixtures` responses; it never writes FPL players, fixtures, or squads.
