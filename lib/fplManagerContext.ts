export type ChipCode = 'TC' | 'BB' | 'FH' | 'WC';

export type ChipUsage = {
  usedCounts: Record<ChipCode, number>;
  available: ChipCode[];
  playedThisGw: ChipCode | null;
};

export type ManagerContext = {
  entryId: string;
  gameweek?: number;
  teamName?: string;
  managerName?: string;
  overallPoints?: number;
  overallRank?: number;
  gwPoints?: number;
  gwRank?: number;
  bank?: number;
  teamValue?: number;
  eventTransfers?: number;
  eventTransfersCost?: number;
  activeChip: ChipCode | null;
  chipUsage: ChipUsage;
};

export const CHIP_ORDER: ChipCode[] = ['TC', 'BB', 'FH', 'WC'];

const CHIP_LABEL: Record<ChipCode, string> = {
  TC: 'Triple Captain',
  BB: 'Bench Boost',
  FH: 'Free Hit',
  WC: 'Wildcard',
};

type EntryResponse = {
  name?: string;
  player_first_name?: string;
  player_last_name?: string;
  summary_overall_points?: number;
  summary_overall_rank?: number;
};

type HistoryResponse = {
  current?: Array<{
    event?: number;
    points?: number;
    rank?: number;
    overall_rank?: number;
    bank?: number;
    value?: number;
    event_transfers?: number;
    event_transfers_cost?: number;
  }>;
  chips?: Array<{ name?: string; event?: number }>;
};

type BootstrapResponse = {
  chips?: Array<{
    name?: string;
    number?: number;
    start_event?: number | null;
    stop_event?: number | null;
  }>;
};

type PicksResponse = {
  active_chip?: string | null;
  entry_history?: {
    bank?: number;
    value?: number;
    event_transfers?: number;
    event_transfers_cost?: number;
    points?: number;
    rank?: number;
    overall_rank?: number;
  };
};

function toNum(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function moneyFromFpl(value: unknown): number | undefined {
  const n = toNum(value);
  return typeof n === 'number' ? Number((n / 10).toFixed(1)) : undefined;
}

export function isValidEntryId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\d+$/.test(value) && value.length > 0;
}

export function normalizeChipName(raw: unknown): ChipCode | null {
  const name = String(raw || '').toLowerCase();
  if (name === '3xc' || name === 'triplecaptain' || name === 'triple_captain') return 'TC';
  if (name === 'bboost' || name === 'benchboost' || name === 'bench_boost') return 'BB';
  if (name === 'freehit' || name === 'free_hit') return 'FH';
  if (name === 'wildcard' || name === 'wild_card') return 'WC';
  return null;
}

export function chipLabel(chip: ChipCode): string {
  return CHIP_LABEL[chip];
}

export function formatChipList(chips: ChipCode[]): string {
  if (!chips.length) return 'none';
  return chips.map(chipLabel).join(', ');
}

export function formatAvailableChipSummary(chipUsage: ChipUsage): string {
  if (!chipUsage.available.length) return 'none';
  return chipUsage.available.map((chip) => {
    if (chip === 'WC' && chipUsage.usedCounts.WC === 1) return 'Second Wildcard';
    return chipLabel(chip);
  }).join(', ');
}

export function formatUsedChipSummary(usedCounts: Record<ChipCode, number>, available?: ChipCode[]): string {
  const used = CHIP_ORDER.filter((chip) => usedCounts[chip] > 0).map((chip) => {
    const count = usedCounts[chip];
    if (chip === 'WC' && count === 1 && available?.includes('WC')) return 'First Wildcard';
    if (chip === 'WC') return count > 1 ? `${chipLabel(chip)} x${count}` : chipLabel(chip);
    return chipLabel(chip);
  });
  return used.length ? used.join(', ') : 'none';
}

export function buildChipContextText(chipUsage: ChipUsage | null, gameweek?: number): string {
  if (!chipUsage) return 'Manager chip history unavailable.';
  const gwLabel = typeof gameweek === 'number' ? `GW${gameweek}` : 'this gameweek';
  const now = chipUsage.playedThisGw
    ? `${chipLabel(chipUsage.playedThisGw)} already played in ${gwLabel}`
    : `No chip played yet in ${gwLabel}`;
  return `${now}. Available chips: ${formatAvailableChipSummary(chipUsage)}. Used so far: ${formatUsedChipSummary(chipUsage.usedCounts, chipUsage.available)}.`;
}

export function buildManagerContextText(managerContext: ManagerContext | null): string {
  if (!managerContext) return 'Manager context unavailable; use squad-only analysis and do not infer chips, rank, or transfer state.';

  const parts = [
    `Entry ID: ${managerContext.entryId}`,
    managerContext.teamName ? `Team: ${managerContext.teamName}` : null,
    managerContext.managerName ? `Manager: ${managerContext.managerName}` : null,
    typeof managerContext.overallRank === 'number' ? `Overall rank: ${managerContext.overallRank.toLocaleString()}` : null,
    typeof managerContext.overallPoints === 'number' ? `Overall points: ${managerContext.overallPoints}` : null,
    typeof managerContext.gwPoints === 'number' ? `GW points: ${managerContext.gwPoints}` : null,
    typeof managerContext.bank === 'number' ? `Bank: £${managerContext.bank.toFixed(1)}m` : null,
    typeof managerContext.teamValue === 'number' ? `Team value: £${managerContext.teamValue.toFixed(1)}m` : null,
    typeof managerContext.eventTransfers === 'number' ? `Transfers this GW: ${managerContext.eventTransfers}` : null,
    typeof managerContext.eventTransfersCost === 'number' ? `Transfer hit cost: ${managerContext.eventTransfersCost}` : null,
    managerContext.activeChip ? `Active chip: ${chipLabel(managerContext.activeChip)}` : 'Active chip: none/unknown',
    `Chip context: ${buildChipContextText(managerContext.chipUsage, managerContext.gameweek)}`,
  ].filter((part): part is string => Boolean(part));

  return parts.join('\n');
}

function inChipWindow(gameweek: number | undefined, chipWindow: { start_event?: number | null; stop_event?: number | null }): boolean {
  if (typeof gameweek !== 'number') return false;
  const start = toNum(chipWindow.start_event);
  const stop = toNum(chipWindow.stop_event);
  return (typeof start !== 'number' || gameweek >= start) && (typeof stop !== 'number' || gameweek <= stop);
}

function chipWasPlayedInWindow(events: number[], chipWindow: { start_event?: number | null; stop_event?: number | null }): boolean {
  return events.some((event) => {
    const start = toNum(chipWindow.start_event);
    const stop = toNum(chipWindow.stop_event);
    return (typeof start !== 'number' || event >= start) && (typeof stop !== 'number' || event <= stop);
  });
}

export function buildChipUsage(
  chips: Array<{ name?: string; event?: number }>,
  gameweek?: number,
  activeChip?: ChipCode | null,
  chipDefinitions?: BootstrapResponse['chips'] | null
): ChipUsage {
  const usedCounts: Record<ChipCode, number> = { TC: 0, BB: 0, FH: 0, WC: 0 };
  let playedThisGw: ChipCode | null = null;
  const wildcardEvents: number[] = [];
  const usedByChip: Record<ChipCode, number[]> = { TC: [], BB: [], FH: [], WC: [] };
  const seenPlays = new Set<string>();

  for (const chipPlay of chips) {
    const chip = normalizeChipName(chipPlay?.name);
    if (!chip) continue;

    const event = Number(chipPlay?.event);
    const eventKey = Number.isFinite(event) ? String(event) : 'unknown';
    const playKey = `${chip}:${eventKey}`;
    if (seenPlays.has(playKey)) continue;
    seenPlays.add(playKey);

    usedCounts[chip] += 1;

    if (Number.isFinite(event)) {
      usedByChip[chip].push(event);
      if (chip === 'WC') wildcardEvents.push(event);
    }
    if (typeof gameweek === 'number' && Number.isFinite(event) && event === gameweek) {
      playedThisGw = chip;
    }
  }

  if (activeChip) {
    const activeEvent = typeof gameweek === 'number' ? gameweek : undefined;
    const alreadyCounted = typeof activeEvent === 'number'
      ? usedByChip[activeChip].includes(activeEvent)
      : usedCounts[activeChip] > 0;

    if (!alreadyCounted) {
      usedCounts[activeChip] += 1;
      if (typeof activeEvent === 'number') {
        usedByChip[activeChip].push(activeEvent);
        if (activeChip === 'WC') wildcardEvents.push(activeEvent);
      }
    }

    if (!playedThisGw) playedThisGw = activeChip;
  }

  const chipWindows = Array.isArray(chipDefinitions) ? chipDefinitions : [];
  const windowsByChip = CHIP_ORDER.reduce<Record<ChipCode, NonNullable<BootstrapResponse['chips']>>>((acc, chip) => {
    acc[chip] = chipWindows.filter((chipWindow) => normalizeChipName(chipWindow?.name) === chip);
    return acc;
  }, { TC: [], BB: [], FH: [], WC: [] });

  const isChipPlayableInCurrentWindow = (chip: ChipCode): boolean => {
    if (typeof gameweek !== 'number') return true;
    const windows = windowsByChip[chip];
    if (!windows.length) return true;
    return windows.some((chipWindow) => inChipWindow(gameweek, chipWindow));
  };

  const wildcardAvailable = (() => {
    if (activeChip === 'WC' || playedThisGw === 'WC') return false;
    const wildcardWindows = windowsByChip.WC;
    if (typeof gameweek !== 'number') return usedCounts.WC === 0;
    if (!wildcardWindows.length) return usedCounts.WC === 0;

    const currentWindow = wildcardWindows.find((chipWindow) => inChipWindow(gameweek, chipWindow));
    if (!currentWindow) return false;

    return !chipWasPlayedInWindow(wildcardEvents, currentWindow);
  })();

  const available = CHIP_ORDER.filter((chip) => {
    if (chip === activeChip || chip === playedThisGw) return false;
    if (!isChipPlayableInCurrentWindow(chip)) return false;
    if (chip === 'WC') return wildcardAvailable;
    return usedCounts[chip] === 0;
  });

  return { usedCounts, available, playedThisGw };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchChipPlaysFromPicks(entryId: string, eventIds: number[]): Promise<Array<{ name?: string; event?: number }>> {
  const uniqueEvents = Array.from(new Set(eventIds))
    .filter((event) => Number.isFinite(event) && event > 0)
    .sort((a, b) => a - b);

  const rows: Array<{ name?: string; event?: number } | null> = await Promise.all(
    uniqueEvents.map(async (event) => {
      const picks = await fetchJson<PicksResponse>(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${event}/picks/`);
      const chip = normalizeChipName(picks?.active_chip);
      return chip ? { name: picks?.active_chip || chip, event } : null;
    })
  );

  return rows.filter((row): row is { name?: string; event?: number } => row !== null);
}

export async function fetchManagerContext(entryId: string, gameweek?: number): Promise<ManagerContext | null> {
  if (!isValidEntryId(entryId)) return null;

  const [entry, history, picks, bootstrap] = await Promise.all([
    fetchJson<EntryResponse>(`https://fantasy.premierleague.com/api/entry/${entryId}/`),
    fetchJson<HistoryResponse>(`https://fantasy.premierleague.com/api/entry/${entryId}/history/`),
    typeof gameweek === 'number'
      ? fetchJson<PicksResponse>(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${gameweek}/picks/`)
      : Promise.resolve(null),
    fetchJson<BootstrapResponse>('https://fantasy.premierleague.com/api/bootstrap-static/'),
  ]);

  if (!entry && !history && !picks) return null;

  const currentRows = Array.isArray(history?.current) ? history.current : [];
  const currentRow = typeof gameweek === 'number'
    ? currentRows.find((row) => row.event === gameweek)
    : currentRows[currentRows.length - 1];
  const historyChips = Array.isArray(history?.chips) ? history.chips : [];
  const scanEventIds = currentRows
    .map((row) => row.event)
    .filter((event): event is number => typeof event === 'number' && Number.isFinite(event) && (typeof gameweek !== 'number' || event <= gameweek));
  if (typeof gameweek === 'number' && !scanEventIds.includes(gameweek)) scanEventIds.push(gameweek);
  const scannedChips = await fetchChipPlaysFromPicks(entryId, scanEventIds);
  const chips = [...historyChips, ...scannedChips];
  const activeChip = normalizeChipName(picks?.active_chip);
  const chipDefinitions = Array.isArray(bootstrap?.chips) ? bootstrap.chips : null;
  const chipUsage = buildChipUsage(chips, gameweek, activeChip, chipDefinitions);
  const entryHistory = picks?.entry_history;
  const managerName = [entry?.player_first_name, entry?.player_last_name].filter(Boolean).join(' ').trim() || undefined;

  return {
    entryId,
    gameweek,
    teamName: entry?.name || undefined,
    managerName,
    overallPoints: toNum(entry?.summary_overall_points),
    overallRank: toNum(entry?.summary_overall_rank),
    gwPoints: toNum(entryHistory?.points) ?? toNum(currentRow?.points),
    gwRank: toNum(entryHistory?.rank) ?? toNum(currentRow?.rank),
    bank: moneyFromFpl(entryHistory?.bank) ?? moneyFromFpl(currentRow?.bank),
    teamValue: moneyFromFpl(entryHistory?.value) ?? moneyFromFpl(currentRow?.value),
    eventTransfers: toNum(entryHistory?.event_transfers) ?? toNum(currentRow?.event_transfers),
    eventTransfersCost: toNum(entryHistory?.event_transfers_cost) ?? toNum(currentRow?.event_transfers_cost),
    activeChip,
    chipUsage,
  };
}
