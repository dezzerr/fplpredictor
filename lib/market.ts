import type { Player } from "@/lib/data";
import type { CalPresetName } from "@/lib/calibration";
import { fetchFplPlayers } from "@/lib/fpl";
import { seedPlayerAliasesFrom } from "@/lib/marketMapping";
import { cachedTeamOdds, cachedGoalscorerOdds, type TeamOdds, type GoalscorerOdds } from "@/lib/odds";
import { lambdasFromTeamOdds, cleanSheetFromLambdas, lambdaGFromAnytime, estimateLambdaA, expectedPlayerMarketPoints } from "@/lib/oddsModel";

// Market-first players fetcher. If odds providers are configured, this will
// compute per-event expected points from market data. Until then, it falls
// back to the calibrated FPL-based players while keeping the same Player shape.
export async function fetchPlayersWithMarket(preset?: CalPresetName | string | null): Promise<Player[]> {
  const MARKET_EP_SCALE = 0.88;

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

  // Odds API responses are not mapped to official FPL gameweek IDs yet. Only
  // use the current provider slate; reusing it for future offsets would make
  // future eventEP values look precise while actually repeating current odds.
  const [odds0, sc0] = await Promise.all([
    cachedTeamOdds(0),
    cachedGoalscorerOdds(0),
  ]);

  const teamOddsByEvent: Record<number, TeamOdds[]> = { 0: odds0 };
  const scorerByEvent: Record<number, GoalscorerOdds[]> = { 0: sc0 };

  // Team-level prices cannot identify which players will receive the attacking
  // returns. Without genuine player odds, keep every player on the usage-aware
  // FPL projection instead of assigning identical shares by position.
  const havePlayerOdds = odds0.length > 0 && sc0.length > 0;
  if (!havePlayerOdds) {
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

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  const enriched: Player[] = fplPlayers.map((p) => {
    const playingTime = p.playingTime || p.expExplain?.playingTime;
    const p60 = clamp01(playingTime?.sixtyMinuteProbability ?? p.minutesProb ?? 0.8);
    const pAppearance = clamp01(playingTime?.appearanceProbability ?? p60);
    const minutesShare = clamp01((playingTime?.expectedMinutes ?? p60 * 90) / 90);

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
      let usedFixtures = 0;

      // Collect any per-fixture anytime odds for this player in this event
      const scList = (scorerByEvent[event] || []).filter(o => o.playerId === p.id);

      for (const { o, teamIsHome } of fixtures) {
        const { lambdaH, lambdaA } = lambdasFromTeamOdds(o);
        const lambdaOpp = teamIsHome ? lambdaA : lambdaH;

        const sc = scList.find(sco => (sco.fixture.home === o.fixture.home && sco.fixture.away === o.fixture.away));
        if (!sc) continue;

        const pCSf = cleanSheetFromLambdas(lambdaOpp);
        pCsSum += pCSf;
        usedFixtures++;
        const lambdaGf = lambdaGFromAnytime(sc.anytime);
        const lambdaAf = estimateLambdaA(lambdaGf, p.position);

        const ep = expectedPlayerMarketPoints({
          position: p.position,
          appearanceProbability: pAppearance,
          sixtyMinuteProbability: p60,
          expectedMinutes: minutesShare * 90,
          lambdaGoal: lambdaGf,
          lambdaAssist: lambdaAf,
          lambdaOpp,
          scale: MARKET_EP_SCALE,
        });

        epSum += ep;
        lambdaGSum += lambdaGf;
        lambdaASum += lambdaAf;
      }

      if (usedFixtures === 0) continue;
      eventEP[event] = Math.round(epSum * 10) / 10; // precision1
      lambdaGArr[event] = Math.round(lambdaGSum * 1000) / 1000;
      lambdaAArr[event] = Math.round(lambdaASum * 1000) / 1000;
      pCSArr[event] = Math.round((pCsSum / usedFixtures) * 1000) / 1000;
      p60Arr[event] = Math.round(p60 * 1000) / 1000;
    }

    const ex = p.expExplain;
    const nextEp = typeof eventEP[0] === 'number' ? eventEP[0] : undefined;
    if (nextEp === undefined) {
      return {
        ...p,
        expExplain: ex ? { ...ex, source: 'fpl' } : undefined,
      };
    }
    return {
      ...p,
      expPoints: nextEp,
      expExplain: {
        ...ex,
        base: ex?.base ?? p.baseExp ?? p.expPoints,
        minutesProb: p60,
        minutesFactor: ex?.minutesFactor ?? 1,
        injuryPenalty: ex?.injuryPenalty ?? 1,
        modelVersion: ex?.modelVersion,
        playingTime,
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
        final: nextEp,
        nextWeekFactor: ex?.nextWeekFactor,
        eventFactors: ex?.eventFactors,
        eventFixtureCounts: ex?.eventFixtureCounts,
        nextEventFixtureCount: ex?.nextEventFixtureCount,
        baseEvent: ex?.baseEvent,
      },
    };
  });

  return enriched;
}
