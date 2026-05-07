import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LookupReason = 'unsupported' | 'temporary';

type LookupCandidate = {
  entryId: number;
  playerName: string;
  teamName: string;
  overallRank?: number;
  overallPoints?: number;
  eventTotal?: number;
};

type LookupPayload = {
  available: boolean;
  query: string;
  candidates: LookupCandidate[];
  message?: string;
  reason?: LookupReason;
};

const SEARCH_ENDPOINTS: Array<(query: string) => string> = [
  (query) => `https://fantasy.premierleague.com/api/entry/search/?phrase=${encodeURIComponent(query)}`,
  (query) => `https://fantasy.premierleague.com/api/entry/search/?query=${encodeURIComponent(query)}`,
  (query) => `https://fantasy.premierleague.com/api/entry/search/?term=${encodeURIComponent(query)}`,
  (query) => `https://fantasy.premierleague.com/api/entry-search/?q=${encodeURIComponent(query)}`,
  (query) => `https://fantasy.premierleague.com/drf/entries/?search=${encodeURIComponent(query)}`,
  (query) => `https://fantasy.premierleague.com/drf/entries/?page=1&search=${encodeURIComponent(query)}`,
];

const LOOKUP_TIMEOUT_MS = 3500;
const MAX_RESULTS = 20;

function parseNumber(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function parseEntryId(raw: unknown): number | null {
  const value = parseNumber(raw);
  if (!value || value <= 0) return null;
  return value;
}

function textValue(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

function candidateFromRow(row: unknown): LookupCandidate | null {
  if (!row || typeof row !== 'object') return null;

  const value = row as Record<string, unknown>;
  const entryId =
    parseEntryId(value.entry) ??
    parseEntryId(value.entry_id) ??
    parseEntryId(value.id) ??
    null;

  if (!entryId) return null;

  const firstName = textValue(value.player_first_name);
  const lastName = textValue(value.player_last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const playerName =
    textValue(value.player_name) ||
    textValue(value.playerName) ||
    fullName ||
    'Unknown Manager';

  const teamName =
    textValue(value.entry_name) ||
    textValue(value.entryName) ||
    textValue(value.team_name) ||
    textValue(value.name) ||
    'Unknown Team';

  const overallRank =
    parseNumber(value.summary_overall_rank) ??
    parseNumber(value.rank) ??
    parseNumber(value.entry_rank);

  const overallPoints =
    parseNumber(value.summary_overall_points) ??
    parseNumber(value.total);

  const eventTotal = parseNumber(value.event_total);

  return {
    entryId,
    playerName,
    teamName,
    overallRank,
    overallPoints,
    eventTotal,
  };
}

function collectSearchArrays(data: unknown): unknown[][] {
  if (Array.isArray(data)) return [data];
  if (!data || typeof data !== 'object') return [];

  const value = data as Record<string, unknown>;
  const buckets: unknown[][] = [];

  for (const key of ['results', 'entries', 'data']) {
    const bucket = value[key];
    if (Array.isArray(bucket)) buckets.push(bucket);
  }

  if (value.standings && typeof value.standings === 'object') {
    const standings = value.standings as Record<string, unknown>;
    if (Array.isArray(standings.results)) {
      buckets.push(standings.results);
    }
  }

  return buckets;
}

function normalizeCandidates(data: unknown): { recognized: boolean; candidates: LookupCandidate[] } {
  const buckets = collectSearchArrays(data);
  if (!buckets.length) {
    return { recognized: false, candidates: [] };
  }

  const byEntryId = new Map<number, LookupCandidate>();

  for (const bucket of buckets) {
    for (const row of bucket) {
      const candidate = candidateFromRow(row);
      if (!candidate) continue;
      if (!byEntryId.has(candidate.entryId)) {
        byEntryId.set(candidate.entryId, candidate);
      }
    }
  }

  return {
    recognized: true,
    candidates: Array.from(byEntryId.values()),
  };
}

function filterCandidates(candidates: LookupCandidate[], query: string): LookupCandidate[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const filtered = candidates.filter((candidate) => {
    const haystack = `${candidate.playerName} ${candidate.teamName}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });

  return filtered
    .sort((a, b) => {
      if (typeof a.overallRank === 'number' && typeof b.overallRank === 'number') {
        return a.overallRank - b.overallRank;
      }
      if (typeof a.overallRank === 'number') return -1;
      if (typeof b.overallRank === 'number') return 1;
      return a.playerName.localeCompare(b.playerName);
    })
    .slice(0, MAX_RESULTS);
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; data?: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return { ok: true, status: response.status, data: await response.json() };
    }

    const text = await response.text();
    try {
      return { ok: true, status: response.status, data: JSON.parse(text) };
    } catch {
      return { ok: true, status: response.status };
    }
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

function response(payload: LookupPayload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get('q') ?? '';
  const query = rawQuery.replace(/\s+/g, ' ').trim();

  if (query.length < 2) {
    return response(
      {
        available: false,
        query,
        candidates: [],
        reason: 'unsupported',
        message: 'Enter at least 2 characters to search by manager name.',
      },
      400
    );
  }

  let hadTemporaryFailure = false;

  for (const endpoint of SEARCH_ENDPOINTS) {
    const result = await fetchJson(endpoint(query));

    if (!result.ok) {
      if (result.status >= 500 || result.status === 429 || result.status === 0) {
        hadTemporaryFailure = true;
      }
      continue;
    }

    const normalized = normalizeCandidates(result.data);
    if (!normalized.recognized) continue;

    return response({
      available: true,
      query,
      candidates: filterCandidates(normalized.candidates, query),
    });
  }

  if (hadTemporaryFailure) {
    return response({
      available: false,
      query,
      candidates: [],
      reason: 'temporary',
      message:
        'Manager lookup is temporarily unavailable from official FPL endpoints. Please try again or enter Team ID directly.',
    });
  }

  return response({
    available: false,
    query,
    candidates: [],
    reason: 'unsupported',
    message:
      'Manager name lookup is currently unavailable from official FPL endpoints. Please enter Team ID directly.',
  });
}
