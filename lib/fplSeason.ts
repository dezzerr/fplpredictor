type FplEvent = { deadline_time?: string | null };

/** FPL's earliest gameweek deadline is its stable season boundary. */
export function seasonKeyFromEvents(events: FplEvent[] | undefined | null): string {
  const deadlines = (events ?? [])
    .map((event) => event.deadline_time ? new Date(event.deadline_time) : null)
    .filter((date): date is Date => !!date && Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const firstDeadline = deadlines[0];
  if (!firstDeadline) return 'unknown';
  const startYear = firstDeadline.getUTCFullYear();
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export async function fetchOfficialSeasonKey(): Promise<string> {
  const response = await fetch(`https://fantasy.premierleague.com/api/bootstrap-static/?t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
  if (!response.ok) throw new Error('Failed to load FPL season');
  const bootstrap = await response.json() as { events?: FplEvent[] };
  return seasonKeyFromEvents(bootstrap.events);
}
