# FPL Companion Content Engine Goal

## Weekly outcome

Produce at least three distinct, evidence-backed FPL articles and three matching email drafts every Gameweek:

1. Gameweek planning, form, fixtures, captaincy and transfers
2. Injuries, suspensions, press conferences and availability
3. Deadline briefing, late team news and final decisions

A post-Gameweek reaction pack is a fourth, optional output.

## Minimum quality bar

Each article-ready fact pack should contain:

- At least five meaningful player or team facts
- Exact evidence quotes and source URLs
- Retrieval time and freshness window
- Current FPL price, ownership, fixture and availability context where relevant
- At least three actionable manager decisions
- Replacement or comparison options
- Confidence per claim

A single isolated signal is an alert, not an article-ready pack.

## Build sequence

### Phase 1: Fact packs and diagnostics

- [x] Split each scan into planning, availability and deadline packs.
- [x] Report per-source item counts, text volume and verified fact counts.
- [x] Keep raw evidence attached to every fact.
- [x] Make thin packs visibly fail the article-ready threshold.

### Phase 2: Coverage

- [x] Add structured official FPL facts for player form, team points/form, upcoming fixtures, prices, ownership and the official deadline.
- [x] Preserve the existing Premier League injury hub and Fantasy Football Scout linked-page hydration.
- [x] Add deadline-window classification: planning, availability within 48 hours, and deadline within 2 hours.
- [ ] Add more official club and BBC collectors. This remains a source-coverage follow-up because no stable allow-listed URLs were verified in this slice.

### Phase 3: Editorial outputs

- [x] Generate one local article draft and one local email draft per pack.
- [x] Save durable JSON packs, diagnostics and six draft files under `output/content-engine/gameweek-<N>/` during a scan.
- [ ] Notion review upload remains intentionally unimplemented in the scanner. Drafts stay local and require Derrick review.
- [x] Do not publish to Sanity or send email.

### Phase 4: Measurement

- [x] Track packs created and packs meeting the quality bar.
- [x] Track verified facts by category.
- [x] Track articles and emails produced.
- [x] Track source contribution, character volume, URL coverage and source failures.
- [ ] Clicks and useful FPL actions require analytics event wiring and are not fabricated by the scanner.

## Implemented modules

- `lib/ai/officialFpl.ts`: official bootstrap and future-fixture retrieval plus planning fact normalization.
- `lib/ai/factPack.ts`: separate packs with official and news evidence, readiness gates and deadline metadata.
- `lib/ai/diagnostics.ts`: source coverage, category counts and deadline-window classification.
- `lib/ai/draftGeneration.ts`: deterministic article and email drafts marked for Derrick review.
- `scripts/run-signal-scan.ts`: writes durable packs, diagnostics and drafts without publishing or sending.
- `test/content-engine.test.ts`: official fact extraction, draft safety and deadline-window coverage tests.

## Current boundary

The engine now produces local, review-only outputs. It does not upload to Notion, publish to Sanity or send email. Live source availability and official FPL API availability remain external runtime dependencies, and analytics click/action measurement still needs product event instrumentation.
