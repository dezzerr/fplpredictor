import type { Player, Position } from "@/lib/data";
import type { CalPresetName } from "@/lib/calibration";
import { fetchFplPlayers } from "@/lib/fpl";
import { seedPlayerAliasesFrom } from "@/lib/marketMapping";
import { cachedTeamOdds, cachedGoalscorerOdds, type TeamOdds, type GoalscorerOdds } from "@/lib/odds";
import { lambdasFromTeamOdds, cleanSheetFromLambdas, lambdaGFromAnytime, estimateLambdaA, expectedCsPoints } from "@/lib/oddsModel";

// Market-first players fetcher. If odds providers are configured, this will
// compute per-event expected points from market data. Until then, it falls
// back to the calibrated FPL-based players while keeping the same Player shape.
export async function fetchPlayersWithMarket(preset?: CalPresetName | string | null): Promise<Player[]> {
  const hasOdds = Boolean(
    process.env.ODDS_API_KEY ||
    process.env.API_FOOTBALL_KEY ||
    process.env.BETFAIR_APP_KEY
  );

  // For now, fall back to FPL-based players. When odds are wired, enrich each
  // player with expExplain.source = 'market' and per-event eventEP/λ/pCS/p60.
  const fplPlayers = await fetchFplPlayers(preset);
  // Seed player alias mapping for odds providers (name -> id under team code)
  seedPlayerAliasesFrom(fplPlayers);

  if (!hasOdds) {
    // Ensure source tag is set for clarity (FPL fallback)
    return fplPlayers.map(p => ({
      ...p,
      expExplain: p.expExplain ? { ...p.expExplain, source: 'fpl' } : undefined,
    }));
  }

  // Fetch odds for the next 3 events (offsets 0..2)
  const [odds0, odds1, odds2] = await Promise.all([
    cachedTeamOdds(0),
    cachedTeamOdds(1),
    cachedTeamOdds(2),
  ]);
  const [sc0, sc1, sc2] = await Promise.all([
    cachedGoalscorerOdds(0),
    cachedGoalscorerOdds(1),
    cachedGoalscorerOdds(2),
  ]);

  const teamOddsByEvent: Record<number, TeamOdds[]> = { 0: odds0, 1: odds1, 2: odds2 };
  const scorerByEvent: Record<number, Map<string, GoalscorerOdds>> = {
    0: new Map(sc0.map(o => [o.playerId, o])),
    1: new Map(sc1.map(o => [o.playerId, o])),
    2: new Map(sc2.map(o => [o.playerId, o])),
  };

  const haveAnyOdds = (odds0.length + odds1.length + odds2.length + sc0.length + sc1.length + sc2.length) > 0;
  if (!haveAnyOdds) {
    // No usable odds yet, keep FPL fallback
    return fplPlayers.map(p => ({
      ...p,
      expExplain: p.expExplain ? { ...p.expExplain, source: 'fpl' } : undefined,
    }));
  }

  // Helper: get all fixtures for a team in a given event (supports DGW with 2+ fixtures)
  function teamFixturesForEvent(event: number, team: string): Array<{ o: TeamOdds; teamIsHome: boolean } > {
    const arr = teamOddsByEvent[event] || [];
    const out: Array<{ o: TeamOdds; teamIsHome: boolean }> = [];
    for (const o of arr) {
      if (o.fixture.home === team) out.push({ o, teamIsHome: true });
      else if (o.fixture.away === team) out.push({ o, teamIsHome: false });
    }
    return out;
  }

  const goalPtsByPos: Record<Position, number> = { GK: 6, DEF: 6, MID: 5, FWD: 4 };
  const assistPts = 3;

  // Fallback shares to distribute team scoring to players when anytime odds missing
  const shareByPos: Record<Position, number> = { GK: 0.00, DEF: 0.05, MID: 0.30, FWD: 0.50 };

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  const enriched: Player[] = fplPlayers.map((p) => {
    // Use the enhanced minutes probability from FPL processing (accounts for form, minutes, loans)
    const p60Base = typeof p.minutesProb === 'number' ? clamp01(p.minutesProb) : 0.8;

    const eventEP: number[] = [];
    const lambdaGArr: number[] = [];
    const lambdaAArr: number[] = [];
    const pCSArr: number[] = [];
    const p60Arr: number[] = [];

    for (let event = 0; event < 3; event++) {
      const fixtures = teamFixturesForEvent(event, p.team);
      if (fixtures.length === 0) {
        // Leave undefined for this event so weeklyExp() can fall back to FPL model
        continue;
      }

      let epSum = 0;
      let lambdaGSum = 0;
      let lambdaASum = 0;
      let pCsSum = 0;
      const p60 = p60Base; // per fixture assumption; display as average per fixture
      const cameoProb = clamp01(Math.max(0, (typeof p.minutesProb === 'number' ? p.minutesProb : p60Base) - p60));

      // Collect any per-fixture anytime odds for this player in this event
      const scList = (scorerByEvent[event] ? Array.from(scorerByEvent[event].values()) : []).filter(o => o.playerId === p.id);

      for (const { o, teamIsHome } of fixtures) {
        const { lambdaH, lambdaA } = lambdasFromTeamOdds(o);
        const lambdaTeam = teamIsHome ? lambdaH : lambdaA;
        const lambdaOpp = teamIsHome ? lambdaA : lambdaH;
        const pCSf = cleanSheetFromLambdas(lambdaOpp);
        pCsSum += pCSf;

        // Match scorer odds entry for this specific fixture if available
        const sc = scList.find(sco => (sco.fixture.home === o.fixture.home && sco.fixture.away === o.fixture.away));
        const lambdaGf = sc ? lambdaGFromAnytime(sc.anytime) : (lambdaTeam * (shareByPos[p.position] || 0));
        const lambdaAf = estimateLambdaA(lambdaGf, p.position);

        const appearanceEP = 2 * p60 + 1 * cameoProb;
        const attackEP = p60 * (lambdaGf * goalPtsByPos[p.position] + lambdaAf * assistPts);
        const csEP = p60 * expectedCsPoints(p.position, lambdaOpp);
        const ep = appearanceEP + attackEP + csEP;

        epSum += ep;
        lambdaGSum += lambdaGf;
        lambdaASum += lambdaAf;
      }

      eventEP[event] = Math.round(epSum * 10) / 10; // precision1
      lambdaGArr[event] = Math.round(lambdaGSum * 1000) / 1000;
      lambdaAArr[event] = Math.round(lambdaASum * 1000) / 1000;
      pCSArr[event] = Math.round((pCsSum / fixtures.length) * 1000) / 1000; // display average per fixture
      p60Arr[event] = Math.round(p60 * 1000) / 1000;
    }

    const ex = p.expExplain;
    const nextEp = typeof eventEP[0] === 'number' ? eventEP[0] : undefined;
    return {
      ...p,
      expPoints: nextEp ?? p.expPoints,
      expExplain: {
        base: ex?.base ?? p.baseExp ?? p.expPoints,
        minutesProb: typeof p.minutesProb === 'number' ? p.minutesProb : p60Base,
        minutesFactor: ex?.minutesFactor ?? 1,
        injuryPenalty: ex?.injuryPenalty ?? 1,
        form: ex?.form ?? (typeof p.form === 'number' ? p.form : 1),
        formFactor: ex?.formFactor ?? 1,
        positionFactor: ex?.positionFactor ?? 1,
        // Preserve penalty metadata when present
        penaltyBoost: ex?.penaltyBoost,
        penaltyTakerRank: ex?.penaltyTakerRank,
        calibration: ex?.calibration,
        // Preserve status metadata when present
        rawStatus: ex?.rawStatus,
        chance: ex?.chance,
        news: ex?.news,
        newsAdded: ex?.newsAdded,
        fixtureWeights: ex?.fixtureWeights ?? [],
        blendedFixtureFactor: ex?.blendedFixtureFactor ?? 1,
        // Market-first additions
        source: 'market',
        eventEP,
        lambdaG: eventEP.length ? lambdaGArr : ex?.lambdaG,
        lambdaA: eventEP.length ? lambdaAArr : ex?.lambdaA,
        pCS: eventEP.length ? pCSArr : ex?.pCS,
        p60: eventEP.length ? p60Arr : ex?.p60,
        final: nextEp ?? ex?.final ?? p.expPoints,
        nextWeekFactor: ex?.nextWeekFactor,
        eventFactors: ex?.eventFactors,
        eventFixtureCounts: ex?.eventFixtureCounts,
        nextEventFixtureCount: ex?.nextEventFixtureCount,
      },
    };
  });

  return enriched;
}
