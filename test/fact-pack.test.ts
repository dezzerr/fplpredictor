import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFactPacks } from '@/lib/ai/factPack';
import type { PreparedSignalRow } from '@/lib/ai/signalRows';

const fact = (signal: string, player = signal): PreparedSignalRow => ({
  player_name: player,
  player_id: player,
  team: 'BRE',
  gameweek: 8,
  signal,
  adjustment: -0.1,
  confidence: 'high',
  reason: 'Verified manager update.',
  source_type: 'article',
  source_label: 'Source | https://example.com/article',
});

test('builds separate planning, availability and deadline packs', () => {
  const packs = buildFactPacks(8, [
    { source: 'Scout', sourceType: 'article', text: 'Evidence', date: '2026-10-20', url: 'https://example.com/article' },
  ], [fact('hot_form', 'Salah'), fact('injured', 'Saka'), fact('suspended', 'Janelt')]);
  assert.deepEqual(packs.map((pack) => pack.kind), ['planning', 'availability', 'deadline']);
  assert.equal(packs.find((pack) => pack.kind === 'planning')?.verifiedFacts, 1);
  assert.equal(packs.find((pack) => pack.kind === 'availability')?.verifiedFacts, 2);
  assert.equal(packs.find((pack) => pack.kind === 'deadline')?.verifiedFacts, 3);
  assert.equal(packs.every((pack) => !pack.articleReady), true);
});
