import test from 'node:test'
import assert from 'node:assert/strict'
import type { Player, Squad } from '@/lib/data'
import { createEmptySquad, FPL_STARTING_BUDGET, inferSetupSource, migratePersistedSquadState, useSquadStore } from '@/store/squad'

const player: Player = {
  id: '101',
  name: 'Preseason Player',
  position: 'MID',
  team: 'COV',
  price: 6.5,
  expPoints: 5,
  nextFixtures: [],
  status: 'fit',
}

function squadWith(overrides: Partial<Squad> = {}): Squad {
  return {
    ...createEmptySquad(),
    ...overrides,
    starters: overrides.starters ?? { GK: [], DEF: [], MID: [], FWD: [] },
    bench: overrides.bench ?? [],
  }
}

test('fresh, reset, manual, and season-rollover squads use the £100m budget', () => {
  assert.equal(createEmptySquad().bank, FPL_STARTING_BUDGET)

  useSquadStore.getState().reset()
  assert.equal(useSquadStore.getState().squad.bank, 100)

  useSquadStore.setState({ seasonKey: '2026-27' })
  useSquadStore.getState().startManualSquad()
  assert.equal(useSquadStore.getState().squad.bank, 100)
  assert.equal(useSquadStore.getState().seasonKey, '2026-27')
  assert.equal(useSquadStore.getState().setupSource, 'manual')

  useSquadStore.getState().syncCurrentSeason([], '2027-28')
  assert.equal(useSquadStore.getState().squad.bank, 100)
  assert.equal(useSquadStore.getState().setupSource, null)
})

test('manual squad creation clears imported state and allows priced player additions', () => {
  useSquadStore.setState({
    seasonKey: '2026-27',
    setupSource: 'imported',
    squad: squadWith({
      bank: 4,
      entryId: '123',
      captainId: player.id,
      starters: { GK: [], DEF: [], MID: [player], FWD: [] },
    }),
    lastImport: { entryId: '123', preset: 'baseline' },
    selectedPlayerId: player.id,
    history: [createEmptySquad()],
  })

  useSquadStore.getState().startManualSquad()
  const manual = useSquadStore.getState()
  assert.equal(manual.squad.bank, 100)
  assert.equal(manual.squad.entryId, undefined)
  assert.equal(manual.lastImport, null)
  assert.equal(manual.selectedPlayerId, null)
  assert.deepEqual(manual.history, [])

  const result = manual.addPlayer(player)
  assert.deepEqual(result, { ok: true })
  assert.equal(useSquadStore.getState().squad.bank, 93.5)
  assert.equal(useSquadStore.getState().squad.starters.MID[0]?.id, player.id)
})

test('imports keep the official bank and failed imports preserve a manual squad', async () => {
  const originalFetch = globalThis.fetch
  useSquadStore.getState().startManualSquad()
  useSquadStore.getState().addPlayer(player)
  const manualSquad = structuredClone(useSquadStore.getState().squad)

  try {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'Picks are not available yet' }), { status: 404 })) as typeof fetch
    const failed = await useSquadStore.getState().initialize({ entryId: '123', preset: 'baseline' })
    assert.equal(failed.ok, false)
    assert.deepEqual(useSquadStore.getState().squad, manualSquad)
    assert.equal(useSquadStore.getState().setupSource, 'manual')

    const imported = squadWith({ bank: 1.7, entryId: '123' })
    globalThis.fetch = (async () => new Response(JSON.stringify(imported), { status: 200 })) as typeof fetch
    const success = await useSquadStore.getState().initialize({ entryId: '123', preset: 'baseline' })
    assert.equal(success.ok, true)
    assert.equal(useSquadStore.getState().squad.bank, 1.7)
    assert.equal(useSquadStore.getState().setupSource, 'imported')
  } finally {
    globalThis.fetch = originalFetch
    useSquadStore.getState().reset()
  }
})

test('persisted squads infer setup source during migration', () => {
  assert.equal(inferSetupSource(squadWith({ starters: { GK: [], DEF: [], MID: [player], FWD: [] } })), 'manual')
  assert.equal(inferSetupSource(squadWith({ entryId: '456' })), 'imported')
  assert.equal(inferSetupSource(createEmptySquad()), null)
})

test('version 2 migration repairs legacy empty £0 squads without changing populated squad banks', () => {
  const legacyEmpty = migratePersistedSquadState({ squad: squadWith({ bank: 0 }), setupSource: 'imported' })
  assert.equal(legacyEmpty.squad.bank, 100)
  assert.equal(legacyEmpty.setupSource, 'imported')

  const populated = migratePersistedSquadState({
    squad: squadWith({ bank: 0, starters: { GK: [], DEF: [], MID: [player], FWD: [] } }),
  })
  assert.equal(populated.squad.bank, 0)
  assert.equal(populated.setupSource, 'manual')
})
