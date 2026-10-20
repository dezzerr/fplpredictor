# Browser News Scanner

## Purpose

The local Fpl browser enriches the public-source scanner with current pages that do not provide a reliable RSS feed. It runs separately from GitHub Actions because GitHub cannot access the local Brave profile.

The browser must be the dedicated profile named `Fpl` on port `9222`:

```text
http://127.0.0.1:9222
```

The allow-list is in `config/browser-sources.json`. Current verified sources are:

- BBC Sport FPL
- Premier League injury hub
- Premier League suspension tracker
- Fantasy Football Scout
- All About FPL
- Arsenal official news
- Chelsea official news
- Liverpool official news
- Manchester United official news

The Premier League injury hub provides coverage for all current FPL clubs. Do not add club URLs from memory. Test and add each URL only after confirming the live page and its terms permit access.

## Browser pack contract

The browser coordinator writes a JSON file with this shape:

```json
{
  "schemaVersion": 1,
  "profile": "Fpl",
  "generatedAt": "2026-10-16T15:00:00.000Z",
  "items": [
    {
      "sourceId": "bbc-fpl-hub",
      "url": "https://www.bbc.co.uk/sport/football/articles/example",
      "title": "Current FPL team news",
      "publishedAt": "2026-10-16T12:30:00.000Z",
      "retrievedAt": "2026-10-16T15:00:00.000Z",
      "text": "Rendered article text ..."
    }
  ]
}
```

The importer rejects:

- Unknown source IDs
- Non-HTTPS URLs
- Hosts or paths outside the allow-list
- A different browser profile
- Future timestamps
- Stale content older than seven days
- Short page fragments
- Duplicate source and URL pairs

## Run locally

Write the pack to `output/browser-news/browser-pack.json`, then run a dry run:

```bash
npm run signals:browser-scan -- --dry-run
```

Or specify a pack path:

```bash
npm run signals:browser-scan -- --input /path/to/browser-pack.json --dry-run
```

A production write uses the same verification path as the scheduled public scanner:

```bash
npm run signals:browser-scan -- --input /path/to/browser-pack.json
```

The process fetches the current official FPL roster and planning Gameweek, extracts signals, matches them to canonical FPL players, requires evidence from the browser text, and only then upserts `player_signals`.

The browser coordinator must not write directly to Supabase. It should only produce the pack. This keeps source collection separate from signal verification and prevents an untrusted page from becoming a live recommendation.
