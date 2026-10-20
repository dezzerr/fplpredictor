import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchOfficialPlanningData, planningFacts } from '@/lib/ai/officialFpl';
import { buildDraftBundle } from '@/lib/ai/draftGeneration';
import { buildScanDiagnostics, scanWindowFor } from '@/lib/ai/diagnostics';
import { buildFactPacks } from '@/lib/ai/factPack';

test('official planning data produces form, fixture, ownership and deadline facts', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => new Response(String(url).includes('bootstrap') ? JSON.stringify({
    events: [{ id: 8, is_next: true, deadline_time: '2026-10-25T10:30:00Z' }],
    teams: [{ id: 1, name: 'Brentford', short_name: 'BRE', form: 'WWD', points: 10, played: 6, strength: 3 }],
    elements: [{ id: 1, web_name: 'Mbeumo', first_name: 'Bryan', second_name: 'Mbeumo', team: 1, element_type: 3, now_cost: 80, selected_by_percent: '25.4', form: '7.2', points_per_game: '6.1', total_points: 40, chance_of_playing: null, status: 'a' }],
  }) : JSON.stringify([{ event: 8, team_h: 1, team_a: 1, kickoff_time: '2026-10-25T12:00:00Z', team_h_difficulty: 3, team_a_difficulty: 4 }]));
  try {
    const data = await fetchOfficialPlanningData();
    const facts = planningFacts(data);
    assert.equal(data.gameweek, 8);
    assert.ok(facts.some((fact) => fact.category === 'player-form'));
    assert.ok(facts.some((fact) => fact.category === 'fixture'));
    assert.ok(facts.some((fact) => fact.category === 'ownership'));
    assert.ok(facts.some((fact) => fact.category === 'deadline'));
  } finally { globalThis.fetch = original; }
});

test('draft bundle remains local-review only and diagnostics expose coverage', () => {
  const packs = buildFactPacks(8, [{ source: 'Scout', sourceType: 'article', text: 'Evidence', date: '2026-10-20', url: 'https://example.com' }], [], [{ category: 'player-form', subject: 'Mbeumo', claim: 'Mbeumo has 7.2 form.', evidence: 'Official FPL bootstrap: Mbeumo, form 7.2.', sourceUrl: 'https://fantasy.premierleague.com/api/bootstrap-static/', confidence: 'high' }]);
  const drafts = buildDraftBundle(packs);
  assert.equal(drafts.length, 6);
  assert.ok(drafts.every((draft) => draft.content.includes('Derrick')));
  assert.ok(drafts.every((draft) => !draft.content.includes('—')));
  const diagnostics = buildScanDiagnostics(8, [{ source: 'Scout', sourceType: 'article', text: 'Evidence', date: '2026-10-20', url: 'https://example.com' }], packs, [{ source: 'BBC', error: 'blocked' }]);
  assert.equal(diagnostics.sourceCoverage.find((source) => source.source === 'Scout')?.items, 1);
  assert.equal(diagnostics.sourceCoverage.find((source) => source.source === 'BBC')?.error, 'blocked');
});

test('scan windows move from planning to availability to deadline', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(scanWindowFor(now, new Date('2026-10-23T10:00:00Z')), 'planning');
  assert.equal(scanWindowFor(now, new Date('2026-10-21T10:00:00Z')), 'availability');
  assert.equal(scanWindowFor(now, new Date('2026-10-20T11:00:00Z')), 'deadline');
});
