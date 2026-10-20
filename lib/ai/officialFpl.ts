export interface OfficialFplTeam {
  id: number;
  name: string;
  shortName: string;
  form: string | null;
  points: number;
  played: number;
  strength: number;
}

export interface OfficialFplPlayer {
  id: number;
  name: string;
  fullName: string;
  team: string;
  position: number;
  price: number;
  ownership: number;
  form: number;
  pointsPerGame: number;
  totalPoints: number;
  chanceOfPlaying: number | null;
  status: string;
  nextFixture: string | null;
}

export interface OfficialPlanningData {
  gameweek: number;
  deadline: string | null;
  retrievedAt: string;
  teams: OfficialFplTeam[];
  players: OfficialFplPlayer[];
  fixtures: Array<{ gameweek: number; home: string; away: string; kickoff: string | null; difficulty: number | null }>;
}

type Bootstrap = {
  events?: Array<{ id: number; is_next?: boolean; is_current?: boolean; deadline_time?: string }>;
  teams?: Array<{ id: number; name: string; short_name: string; form?: string | null; points?: number; played?: number; strength?: number }>;
  element_types?: Array<{ id: number; singular_name?: string }>;
  elements?: Array<Record<string, unknown>>;
};

type Fixture = { event?: number; team_h: number; team_a: number; kickoff_time?: string | null; team_h_difficulty?: number; team_a_difficulty?: number };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Official FPL request failed with HTTP ${response.status}: ${url}`);
  return response.json() as Promise<T>;
}

const number = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const nullableNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Fetches only official FPL facts used by planning content. */
export async function fetchOfficialPlanningData(): Promise<OfficialPlanningData> {
  const bootstrap = await getJson<Bootstrap>('https://fantasy.premierleague.com/api/bootstrap-static/');
  const next = bootstrap.events?.find((event) => event.is_next) ?? bootstrap.events?.find((event) => event.is_current);
  if (!next) throw new Error('Official FPL data did not identify a current or next Gameweek');
  const teamRows = bootstrap.teams ?? [];
  const teams = new Map(teamRows.map((team) => [team.id, team]));
  const fixtures = await getJson<Fixture[]>('https://fantasy.premierleague.com/api/fixtures/?future=1');
  const teamNames = new Map(teamRows.map((team) => [team.id, team.short_name]));
  const futureFixtures = fixtures
    .filter((fixture) => typeof fixture.event === 'number' && fixture.event >= next.id && fixture.event <= next.id + 2)
    .map((fixture) => ({
      gameweek: fixture.event!,
      home: teamNames.get(fixture.team_h) ?? `Team ${fixture.team_h}`,
      away: teamNames.get(fixture.team_a) ?? `Team ${fixture.team_a}`,
      kickoff: fixture.kickoff_time ?? null,
      difficulty: fixture.team_h_difficulty ?? fixture.team_a_difficulty ?? null,
    }));
  const players = (bootstrap.elements ?? []).map((row) => {
    const teamId = number(row.team);
    const team = teams.get(teamId);
    return {
      id: number(row.id), name: String(row.web_name ?? ''),
      fullName: `${String(row.first_name ?? '')} ${String(row.second_name ?? '')}`.trim(),
      team: team?.short_name ?? `Team ${teamId}`, position: number(row.element_type),
      price: number(row.now_cost) / 10, ownership: number(row.selected_by_percent),
      form: number(row.form), pointsPerGame: number(row.points_per_game), totalPoints: number(row.total_points),
      chanceOfPlaying: nullableNumber(row.chance_of_playing), status: String(row.status ?? 'a'),
      nextFixture: futureFixtures.find((fixture) => fixture.gameweek === next.id && (fixture.home === team?.short_name || fixture.away === team?.short_name))?.home === team?.short_name
        ? futureFixtures.find((fixture) => fixture.gameweek === next.id && fixture.home === team?.short_name)?.away ?? null
        : futureFixtures.find((fixture) => fixture.gameweek === next.id && fixture.away === team?.short_name)?.home ?? null,
    };
  }).filter((player) => player.name);
  return {
    gameweek: next.id, deadline: next.deadline_time ?? null, retrievedAt: new Date().toISOString(),
    teams: teamRows.map((team) => ({ id: team.id, name: team.name, shortName: team.short_name, form: team.form ?? null, points: number(team.points), played: number(team.played), strength: number(team.strength) })),
    players, fixtures: futureFixtures,
  };
}

export interface OfficialPlanningFact {
  category: 'player-form' | 'team-form' | 'fixture' | 'price' | 'ownership' | 'captaincy' | 'deadline';
  subject: string;
  claim: string;
  evidence: string;
  sourceUrl: string;
  confidence: 'high';
}

export function planningFacts(data: OfficialPlanningData): OfficialPlanningFact[] {
  const facts: OfficialPlanningFact[] = [];
  const sourceUrl = 'https://fantasy.premierleague.com/api/bootstrap-static/';
  const topForm = [...data.players].sort((a, b) => b.form - a.form).slice(0, 5);
  for (const player of topForm) {
    facts.push({ category: 'player-form', subject: player.name, claim: `${player.name} has ${player.form.toFixed(1)} form and ${player.pointsPerGame.toFixed(1)} points per game.`, evidence: `Official FPL bootstrap: ${player.name}, form ${player.form}, points per game ${player.pointsPerGame}.`, sourceUrl, confidence: 'high' });
    facts.push({ category: 'price', subject: player.name, claim: `${player.name} costs £${player.price.toFixed(1)}m.`, evidence: `Official FPL bootstrap: ${player.name}, current price £${player.price.toFixed(1)}m.`, sourceUrl, confidence: 'high' });
  }
  for (const team of [...data.teams].sort((a, b) => b.points - a.points).slice(0, 3)) facts.push({ category: 'team-form', subject: team.shortName, claim: `${team.shortName} have ${team.points} league points from ${team.played} matches. Their official form string is ${team.form ?? 'not available'}.`, evidence: `Official FPL bootstrap: ${team.shortName}, points ${team.points}, played ${team.played}, form ${team.form ?? 'not available'}.`, sourceUrl, confidence: 'high' });
  for (const fixture of data.fixtures.filter((fixture) => fixture.gameweek === data.gameweek).slice(0, 6)) facts.push({ category: 'fixture', subject: `${fixture.home} v ${fixture.away}`, claim: `${fixture.home} play ${fixture.away} in Gameweek ${fixture.gameweek}.`, evidence: `Official FPL fixtures: ${fixture.home} v ${fixture.away}, Gameweek ${fixture.gameweek}.`, sourceUrl: 'https://fantasy.premierleague.com/api/fixtures/?future=1', confidence: 'high' });
  const popular = [...data.players].sort((a, b) => b.ownership - a.ownership).slice(0, 3);
  for (const player of popular) facts.push({ category: 'ownership', subject: player.name, claim: `${player.name} is owned by ${player.ownership.toFixed(1)}% of managers.`, evidence: `Official FPL bootstrap: ${player.name}, ownership ${player.ownership}%.`, sourceUrl, confidence: 'high' });
  const captaincyCandidates = [...data.players].filter((player) => player.form > 0 && player.ownership >= 10).sort((a, b) => (b.form * b.ownership) - (a.form * a.ownership)).slice(0, 3);
  for (const player of captaincyCandidates) facts.push({ category: 'captaincy', subject: player.name, claim: `${player.name} is a captaincy candidate from official form ${player.form.toFixed(1)} and ownership ${player.ownership.toFixed(1)}%.`, evidence: `Official FPL bootstrap: ${player.name}, form ${player.form}, ownership ${player.ownership}%. This is context, not a captain recommendation.`, sourceUrl, confidence: 'high' });
  if (data.deadline) facts.push({ category: 'deadline', subject: `Gameweek ${data.gameweek}`, claim: `The Gameweek ${data.gameweek} deadline is ${data.deadline}.`, evidence: `Official FPL event deadline_time: ${data.deadline}.`, sourceUrl, confidence: 'high' });
  return facts;
}
