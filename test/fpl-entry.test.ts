import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFplEntryId, validEntryId } from '@/lib/fplEntry'

test('parses numeric FPL entry IDs and official entry URLs', () => {
  assert.equal(parseFplEntryId('1234567'), '1234567')
  assert.equal(parseFplEntryId('000123'), '123')
  assert.equal(parseFplEntryId('https://fantasy.premierleague.com/entry/1234567/event/1'), '1234567')
  assert.equal(parseFplEntryId('https://fantasy.premierleague.com/entry/1234567/'), '1234567')
})

test('rejects malformed, non-official, and invalid FPL entry values', () => {
  for (const value of ['', '0', '-1', '100000000', 'abc', 'https://example.com/entry/123', 'http://fantasy.premierleague.com/entry/123', 'https://fantasy.premierleague.com/entry/not-a-number']) {
    assert.equal(parseFplEntryId(value), null, value)
  }
  assert.equal(validEntryId('1'), true)
  assert.equal(validEntryId('100000000'), false)
})
