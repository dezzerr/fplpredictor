type BootstrapEvent = {
  id?: number;
  is_next?: boolean;
  is_current?: boolean;
  finished?: boolean;
};

export function parseGameweek(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function resolveSelectedGameweek(currentGw: number | null | undefined, gwOffset = 0, fallbackGw?: number | null): number | null {
  const base = parseGameweek(currentGw) ?? parseGameweek(fallbackGw);
  if (base === null) return null;
  return base + Math.max(0, gwOffset);
}

export async function fetchOfficialPlanningGameweek(): Promise<number | null> {
  try {
    const res = await fetch(`https://fantasy.premierleague.com/api/bootstrap-static/?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const events: BootstrapEvent[] = Array.isArray(data?.events) ? data.events : [];
    const target = events.find((event) => event.is_next) || events.find((event) => event.is_current) || events.find((event) => !event.finished);
    return parseGameweek(target?.id);
  } catch {
    return null;
  }
}
