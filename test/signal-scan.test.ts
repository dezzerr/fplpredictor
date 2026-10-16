import test from 'node:test';
import assert from 'node:assert/strict';
import { matchSignalsToPlayers, type MatchedSignal } from '@/lib/ai/matching';
import { prepareSignalRows } from '@/lib/ai/signalRows';
import type { PlayerSignal } from '@/lib/ai/gemini';
import { fetchArticles } from '@/lib/ai/scrapers';

const signal = (playerName: string, team = 'TOT'): PlayerSignal => ({
  playerName, team, signal: 'injured', adjustment: -0.15, confidence: 'high', reason: 'Manager confirmed injury.',
});

test('roster matching rejects substrings, wrong clubs and ambiguous surnames', () => {
  const players = [
    { id: '1', name: 'Johnson', team: 'TOT' },
    { id: '2', name: 'Alex Smith', team: 'TOT' },
    { id: '3', name: 'Adam Smith', team: 'TOT' },
    { id: '4', name: 'Salah', team: 'LIV', aliases: ['Mohamed Salah'] },
  ];
  assert.deepEqual(matchSignalsToPlayers([signal('Son'), signal('Smith'), signal('Salah', 'ARS')], players), []);
  assert.deepEqual(matchSignalsToPlayers([signal('Mohamed Salah', 'LIV')], players).map(p => [p.playerId, p.playerName]), [['4', 'Salah']]);
});

test('writes require a quote from the specified source and deduplicate canonical player IDs', () => {
  const content = [{ source: 'Scout', sourceType: 'article' as const, text: 'Salah is injured and will miss the match.', date: '2026-10-16', url: 'https://example.com/news' }];
  const good: MatchedSignal = { ...signal('Salah', 'LIV'), playerId: '4', sourceIndex: 1, evidence: 'Salah is injured and will miss the match.' };
  assert.equal(prepareSignalRows([{ ...good, sourceIndex: 2 }, { ...good, evidence: 'An invented injury quote.' }], content, 7).length, 0);
  const rows = prepareSignalRows([{ ...good, confidence: 'low' }, good], content, 7);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].confidence, 'high');
  assert.equal(rows[0].gameweek, 7);
  assert.equal(rows[0].source_label, 'Scout | https://example.com/news');
});

test('RSS collection keeps title context and skips stale, undated or malformed items', async () => {
  const original = globalThis.fetch;
  const now = new Date().toUTCString();
  globalThis.fetch = async () => new Response(`<rss><channel>
    <item><title>Salah injury news</title><pubDate>${now}</pubDate><description>The manager confirmed he will miss the upcoming game.</description></item>
    <item><title>Bad date</title><pubDate>invalid</pubDate><description>Enough content but this date is invalid.</description></item>
    <item><title>Old story</title><pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate><description>Old injury should never affect a new Gameweek.</description></item>
    <item><title>No date</title><description>Undated injury should not be considered fresh.</description></item>
  </channel></rss>`);
  try {
    const items = await fetchArticles({ type: 'article', label: 'Scout', feedUrl: 'https://example.com/feed' });
    assert.equal(items.length, 1);
    assert.match(items[0].text, /^Salah injury news/);
  } finally { globalThis.fetch = original; }
});
