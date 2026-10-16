# FPL Signal Scan Runbook

## What is now wired

The repository now has a standalone signal scanner that runs independently of a Netlify deployment:

- `scripts/run-signal-scan.ts` collects configured sources, extracts player signals, matches them to official FPL players and upserts `player_signals` in Supabase.
- `npm run signals:scan` runs the scanner locally or in CI.
- `.github/workflows/fpl-signal-scan.yml` supports manual runs and a six-hour schedule.
- Fantasy Football Scout's verified RSS feed is configured as the first source.

The deployed application reads the stored signals. New scans do not require a Netlify deployment.

## Release layout

The application currently deploys from `feature/fpl-sync-integration`; the repository's default `main` branch contains an older application. To avoid deploying unrelated application work, scanner code is released on `codex/fpl-signal-scan`. The scheduled workflow on `main` checks out an immutable scanner release commit. Updating the scanner requires testing a new release and updating that checkout SHA on `main`. Do not merge the old application on `main` into the production branch.

The scanner fetches the official roster and planning Gameweek together. Club matches must agree and ambiguous player names are skipped. Each stored signal must include a supporting quote found in the specified source. The source label includes the article URL. Writes use one atomic upsert batch and canonical FPL names to avoid duplicate aliases.

## Required GitHub Actions secrets

Add these repository secrets in GitHub under **Settings → Secrets and variables → Actions**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `YOUTUBE_API_KEY` (optional until a YouTube source is enabled)

The service-role key is server-only. Never use it in a browser bundle or commit it to the repository.

## Manual local run

From the application root:

```bash
npm run signals:scan
```

The local environment must provide:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

`.env.local` is loaded automatically. To preview extraction without writing to Supabase:

```bash
npm run signals:scan -- --dry-run
```

A dry run requires only `GEMINI_API_KEY`. It still calls Gemini and uses API credits.

## Manual GitHub run

1. Push a tested scanner release and the pinned workflow to the repository's default branch.
2. Add the required Actions secrets.
3. Open **Actions → FPL signal scan**.
4. Select **Run workflow**.
5. Review the job log and the inserted signal count.

The manual workflow also offers a `dry_run` checkbox. Leave it unchecked for a production write. A dry run never proves that Supabase writes work.

The scheduled workflow runs every six hours in UTC. A deadline-specific schedule should be added only after the first manual production run has been verified.

## Current limitation

The first version uses public RSS collection only. Persistent-browser enrichment is not part of the GitHub runner because the runner cannot access the local Brave or Chrome profile. Browser-assisted research should run as a separate local coordinator and submit a verified research pack to the same processing path.

## Verification checklist

- Confirm the workflow completes without source, Gemini or Supabase errors.
- Check that the reported Gameweek is the planning Gameweek.
- Query `player_signals` for the reported Gameweek.
- Confirm matched signals have an official FPL `player_id`.
- Confirm the deployed app reflects the signals in player projections and insights.
- Do not add more sources until the first source has been observed for at least one complete scan cycle.

## Troubleshooting

- Gemini `402 Payment Required` / depleted prepayment credits: restore credits in the API key's Google AI Studio project. The scanner fails rather than inventing fallback signals. This is not fixed by changing prompts or retrying.
- Missing or invalid service-role key: add the real server key for the FPL Companion project as the repository secret. A masked or placeholder value from another service is not a usable key. Never substitute the public anon key or relax RLS.
- Zero verified signals can be legitimate with RSS excerpts. Inspect the collected item count and verified output; missing quotes and uncertain player matches are intentionally discarded. Do not fabricate a signal to make verification pass.
- Build errors from generated copies under `output/`: these files are excluded by the main TypeScript configuration and must not be compiled as application sources.
