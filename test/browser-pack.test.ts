import test from 'node:test';
import assert from 'node:assert/strict';
import { readBrowserPack } from '@/lib/ai/browserPack';

const now = new Date('2026-10-16T15:00:00.000Z');

function pack(item: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    profile: 'Fpl',
    generatedAt: now.toISOString(),
    items: [
      {
        sourceId: 'bbc-fpl-hub',
        url: 'https://www.bbc.co.uk/sport/football/articles/example',
        retrievedAt: now.toISOString(),
        text: 'The manager confirmed the player is fit and available for the next Premier League match.',
        ...item,
      },
    ],
  };
}

test('browser pack accepts fresh content from an allow-listed Fpl source', () => {
  const content = readBrowserPack(pack({}), now);
  assert.equal(content.length, 1);
  assert.equal(content[0].sourceType, 'browser');
  assert.equal(content[0].source, 'BBC Sport FPL');
});

test('browser pack rejects an unapproved host', () => {
  assert.throws(
    () => readBrowserPack(pack({ url: 'https://example.com/news' }), now),
    /host is not allow-listed/,
  );
});

test('browser pack rejects an unapproved profile', () => {
  assert.throws(
    () => readBrowserPack({ ...pack({}), profile: 'Work' }, now),
    /must come from the Fpl browser profile/,
  );
});

test('browser pack drops stale articles and short page fragments', () => {
  const content = readBrowserPack({
    ...pack({}),
    items: [
      {
        sourceId: 'bbc-fpl-hub',
        url: 'https://www.bbc.co.uk/sport/football/articles/old',
        publishedAt: '2026-10-01T12:00:00.000Z',
        retrievedAt: now.toISOString(),
        text: 'The manager confirmed the player is fit and available for the next Premier League match.',
      },
      {
        sourceId: 'bbc-fpl-hub',
        url: 'https://www.bbc.co.uk/sport/football/articles/short',
        retrievedAt: now.toISOString(),
        text: 'Too short',
      },
    ],
  }, now);
  assert.deepEqual(content, []);
});
