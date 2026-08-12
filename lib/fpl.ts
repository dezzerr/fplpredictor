import type { Player, Position, Fixture } from "@/lib/data";
import { getCalibration, type CalPresetName } from "@/lib/calibration";
import { FPL_POSITION_MAP } from "@/lib/constants";
import { getLiveEvent } from "@/lib/liveWindow";
import { createClient } from '@supabase/supabase-js';
import { seedTeamAliasesFrom } from '@/lib/marketMapping';
import { seasonKeyFromEvents } from '@/lib/fplSeason';
import { estimatePlayingTime, performanceSignalMultiplier } from '@/lib/playingTime';
import { estimateProjectionBase } from '@/lib/productivity';
import { fetchPlayerUsageHistory } from '@/lib/playerUsage';
import { getConfiguredSupabaseServiceKey } from '@/lib/supabase/service-key';

/** Cached signals for the current request (avoid repeated DB calls) */
type SignalRow = {
  player_id: string;
  player_name: string;
  team: string;
  signal: string;
  adjustment: number;
  confidence: string;
  reason: string;
  source_type?: string;
};

async function fetchSignalsForGw(gw: number): Promise<Map<string, SignalRow[]>> {
  const map = new Map<string, SignalRow[]>();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getConfiguredSupabaseServiceKey() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !gw) return map;

  try {
    const sb = createClient(url, key);
    const { data } = await sb
      .from('player_signals')
      .select('player_id,player_name,team,signal,adjustment,confidence,reason,source_type')
      .eq('gameweek', gw);
    if (data) {
      for (const row of data as SignalRow[]) {
        if (!row.player_id) continue;
        const arr = map.get(row.player_id) || [];
        arr.push(row);
        map.set(row.player_id, arr);
      }
    }
  } catch (err) {
    console.warn('[FPL] Failed to fetch signals:', (err as Error).message);
  }
  return map;
}

function mapStatus(s: string): Player["status"] {
  // FPL: a=available, d=doubtful, i=injured, s=suspended, n=not in squad, u=unknown
  // Treat 'u' (unknown) as 'flag' to surface uncertainty in the UI.
  if (s === "a") return "fit";
  if (s === "d" || s === "u") return "flag";
  return "out";
}

export async function fetchFplPlayers(preset?: CalPresetName | string | null): Promise<Player[]> {
  // Fetch bootstrap strictly (must succeed)
  // Add timestamp to bust FPL API cache
  const timestamp = Date.now();
  const bootstrapRes = await fetch(`https://fantasy.premierleague.com/api/bootstrap-static/?t=${timestamp}`, { 
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  if (!bootstrapRes.ok) throw new Error("Failed to load FPL bootstrap");
  const bootstrap = await bootstrapRes.json();
  
  console.log('[FPL] Fetching player data...');

  const teams: Array<{ id: number; short_name: string; name: string; played?: number; strength_overall_home?: number; strength_overall_away?: number }> = bootstrap.teams || [];
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const teamShort: Record<number, string> = Object.fromEntries(
    teams.map((t: any) => [t.id, t.short_name])
  );
  const teamName: Record<number, string> = Object.fromEntries(
    teams.map((t) => [t.id, t.name])
  );
  seedTeamAliasesFrom(teams);

  const rawStrengths = teams.map((team) => (
    (Number(team.strength_overall_home) || 0) + (Number(team.strength_overall_away) || 0)
  ) / 2);
  const minimumStrength = rawStrengths.length ? Math.min(...rawStrengths) : 0;
  const maximumStrength = rawStrengths.length ? Math.max(...rawStrengths) : 1;
  const teamStrengthById: Record<number, number> = Object.fromEntries(teams.map((team, index) => {
    const raw = rawStrengths[index];
    const normalized = maximumStrength === minimumStrength ? 3 : 1 + ((raw - minimumStrength) / (maximumStrength - minimumStrength)) * 4;
    return [team.id, normalized];
  }));
  const teamStrengthByCode: Record<string, number> = Object.fromEntries(teams.map((team) => [team.short_name, teamStrengthById[team.id] ?? 3]));

  // Determine the target event id — prefer current when GW is in live window
  const events: Array<any> = bootstrap.events || [];
  const live = await getLiveEvent(events);
  let nextEvent: any = null;
  const gwIsLive = !!live;
  if (live) {
    nextEvent = live.event;
  } else {
    nextEvent = events.find((e) => e.is_next) || events.find((e) => e.is_current) || events.find((e) => !e.finished);
  }
  const nextEventId: number | undefined = nextEvent?.id;
  const seasonKey = seasonKeyFromEvents(events);

  // Fetch fixtures best-effort (tolerate failures by using empty list)
  // When GW is live, fetch ALL fixtures so current GW opponents appear on player tiles
  let fixtures: any[] = [];
  try {
    const fixturesUrl = gwIsLive
      ? "https://fantasy.premierleague.com/api/fixtures/"
      : "https://fantasy.premierleague.com/api/fixtures/?future=1";
    const fixturesRes = await fetch(fixturesUrl, { next: { revalidate: 900 } });
    if (fixturesRes.ok) {
      fixtures = await fixturesRes.json();
    } else {
      // eslint-disable-next-line no-console
      console.warn("FPL fixtures fetch not ok, proceeding without fixtures:", fixturesRes.status);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("FPL fixtures fetch failed, proceeding without fixtures:", (err as Error).message);
  }
  
  console.log('[FPL] Current/Next Event ID:', nextEventId, 'Total events:', events.length);
  console.log('[FPL] Next event details:', nextEvent ? { id: nextEvent.id, name: nextEvent.name, deadline: nextEvent.deadline_time } : 'None');

  // Pre-compute fixtures by team (upcoming only, sorted by event/kickoff)
  const teamFixtures: Record<number, any[]> = {};
  for (const fx of fixtures as any[]) {
    if (typeof fx.event !== "number" && !fx.kickoff_time) continue;
    const eventNum: number = fx.event ?? 999; // some future fixtures may not have event yet
    // Only consider upcoming fixtures; if nextEventId known, use it
    if (typeof nextEventId === "number" && eventNum < nextEventId) continue;
    // bucket both home and away teams
    for (const teamId of [fx.team_h, fx.team_a]) {
      if (!teamFixtures[teamId]) teamFixtures[teamId] = [];
      teamFixtures[teamId].push(fx);
    }
  }
  // Sort buckets
  for (const k of Object.keys(teamFixtures)) {
    teamFixtures[+k].sort((a, b) => {
      const ae = (a.event ?? 999);
      const be = (b.event ?? 999);
      if (ae !== be) return ae - be;
      const at = a.kickoff_time ? new Date(a.kickoff_time).getTime() : 0;
      const bt = b.kickoff_time ? new Date(b.kickoff_time).getTime() : 0;
      return at - bt;
    });
  }

  const elements: Array<any> = bootstrap.elements || [];
  const calib = getCalibration(preset as any);

  // Fetch operational context in bulk. Both sources are best-effort and the
  // projection model remains functional when either is unavailable.
  const planningGameweek = typeof nextEventId === 'number' ? nextEventId : 0;
  const [signalsMap, usageHistory] = await Promise.all([
    fetchSignalsForGw(planningGameweek),
    fetchPlayerUsageHistory(seasonKey, planningGameweek),
  ]);

  // Build team form map (recent results) - use team strength for now, enhance later with API
  const teamFormMap: Record<number, number> = Object.fromEntries(
    teams.map((team) => [team.id, (teamStrengthById[team.id] ?? 3) * 2])
  );

  const players: Player[] = elements.filter((el: any) => teamById.has(el.team)).map((el: any) => {
    const teamId: number = el.team;
    const team = teamShort[teamId] || "UNK";
    const position: Position = FPL_POSITION_MAP[el.element_type as number];
    const price = (el.now_cost ?? 0) / 10;
    const baseExp = parseFloat(el.ep_next ?? "0") || 0;
    const formVal = parseFloat(el.form ?? "0") || 0;
    const statusCode: string = el.status || "u";
    const chance: number | null = typeof el.chance_of_playing_next_round === "number" ? el.chance_of_playing_next_round : null;
    
    const recentMinutes = parseInt(el.minutes ?? "0") || 0;
    const starts = parseInt(el.starts ?? "0") || 0;
    const teamMatchesPlayed = Math.max(0, Number(teamById.get(teamId)?.played) || 0);
    const ownPct = parseFloat(el.selected_by_percent ?? "0") || 0;
    const statsMatches = teamMatchesPlayed > 0
      ? teamMatchesPlayed
      : (starts > 0 || recentMinutes > 0 ? 38 : 1);
    const playerSignals = signalsMap.get(String(el.id)) || [];
    const playingTime = estimatePlayingTime({
      team,
      starts,
      minutes: recentMinutes,
      teamMatchesPlayed,
      statusCode,
      chanceOfPlaying: chance,
      snapshots: usageHistory.get(String(el.id)) || [],
      signals: playerSignals,
    });
    const minutesProb = playingTime.sixtyMinuteProbability;
    
    // Get player's recent points (last 3-5 games average)
    const totalPoints = parseFloat(el.total_points ?? "0") || 0;
    const officialPointsPerGame = parseFloat(el.points_per_game ?? "0") || 0;
    const pointsPerGame = officialPointsPerGame || totalPoints / Math.max(1, statsMatches);
    
    // Get team strength and form
    const teamStrength = teamStrengthById[teamId] || 3;
    const teamForm = teamFormMap[teamId] || 5;

    const ownership = ownPct || undefined;
    const rawPriceChangeEvent = Number(el.cost_change_event);
    const priceChangeEvent = Number.isFinite(rawPriceChangeEvent)
      ? Math.round((rawPriceChangeEvent / 10) * 10) / 10
      : undefined;
    const rawTransfersInEvent = Number(el.transfers_in_event);
    const transfersInEvent = Number.isFinite(rawTransfersInEvent) ? rawTransfersInEvent : undefined;
    const rawTransfersOutEvent = Number(el.transfers_out_event);
    const transfersOutEvent = Number.isFinite(rawTransfersOutEvent) ? rawTransfersOutEvent : undefined;

    // Build nextFixtures: take upcoming 10 for the player's team, compute opp and diff for that team side
    const tf = (teamFixtures[teamId] || []).slice(0, 10);
    const nextFixtures: Fixture[] = tf.map((fx: any) => {
      const isHome = fx.team_h === teamId;
      const oppId = isHome ? fx.team_a : fx.team_h;
      const opp = teamShort[oppId] || "UNK";
      const diff = isHome ? fx.team_h_difficulty : fx.team_a_difficulty;
      const event = typeof fx.event === "number" ? fx.event : undefined;
      return { opp, H: !!isHome, diff: typeof diff === "number" ? diff : 3, event };
    });

    // Multi-fixture horizon (blend next up to 3 fixtures with decaying weights)
    const rawWeights = (calib.horizonWeights || [0.6, 0.25, 0.15]).slice(0, nextFixtures.length || 1);
    const wSum = rawWeights.reduce((a, b) => a + b, 0) || 1;
    const weights = rawWeights.map((w) => w / wSum);

    // Fixture factors per fixture with team strength differential
    const fixtureWeights: Array<{ w: number; d: number; H: boolean; factor: number }> = (nextFixtures.length ? nextFixtures : [{ H: false, diff: 3, opp: "" } as any]).map((f, i) => {
      const d = f.diff ?? 3; // 1 easiest, 5 hardest
      const isHome = !!f.H;
      const opp = f.opp || "";
      
      // Base difficulty factor
      const diffFactor = 1 + calib.fixtures.diffScale * (3 - d) / 3;
      const hb = calib.fixtures.homeBoost;
      const homeFactor = isHome ? hb : 1 / hb;
      
      // Team strength differential (big teams vs small teams)
      const oppStrength = teamStrengthByCode[opp] || 3;
      const strengthDiff = teamStrength - oppStrength; // -2.5 to +2.5 typical range
      // Stronger team vs weaker = boost, weaker vs stronger = penalty
      const strengthFactor = 1 + (strengthDiff * 0.05); // ±12.5% max impact (more conservative)
      
      return { w: weights[i] ?? 1, d, H: isHome, factor: diffFactor * homeFactor * strengthFactor };
    });
    const blendedFixtureFactor = fixtureWeights.reduce((s, f) => s + f.w * f.factor, 0);
    // DGW/Blank aware: build per-event factors for the next 3 consecutive events (include blanks as 0)
    const eventFactors: number[] = (() => {
      const hb = calib.fixtures.homeBoost;
      const out: number[] = [];
      if (typeof nextEventId !== "number") {
        // fallback to first three fixture factors
        for (let i=0;i<Math.min(3, fixtureWeights.length); i++) out.push(fixtureWeights[i].factor);
        return out;
      }
      const allEvents: number[] = (Array.isArray((bootstrap as any).events) ? (bootstrap as any).events : [])
        .map((e:any)=> e.id)
        .filter((id:any)=> typeof id === 'number' && id >= nextEventId)
        .sort((a:number,b:number)=> a-b);
      const teamFx = (teamFixtures[teamId] || []).filter((fx: any) => typeof fx.event === "number");
      for (let i=0; i<Math.min(10, allEvents.length); i++) {
        const ev = allEvents[i];
        const list = teamFx.filter((fx:any)=> fx.event === ev);
        if (list.length === 0) { out.push(0); continue; } // blank
        const factors: number[] = [];
        for (const fx of list) {
          const isHome = fx.team_h === teamId;
          const diffRaw = isHome ? fx.team_h_difficulty : fx.team_a_difficulty;
          const d = typeof diffRaw === "number" ? diffRaw : 3;
          const oppId = isHome ? fx.team_a : fx.team_h;
          const oppTeam = teamShort[oppId] || "";
          const oppStrength = teamStrengthByCode[oppTeam] || 3;
          const strengthDiff = teamStrength - oppStrength;
          const strengthFactor = 1 + (strengthDiff * 0.05); // More conservative
          const diffFactor = 1 + calib.fixtures.diffScale * (3 - d) / 3;
          const homeFactor = isHome ? hb : 1 / hb;
          factors.push(diffFactor * homeFactor * strengthFactor);
        }
        out.push(factors.reduce((a,b)=> a+b, 0) / factors.length);
      }
      return out;
    })();
    // Also compute per-event fixture counts for next 3 events (for UI/logic)
    const eventFixtureCounts: number[] | undefined = (() => {
      if (typeof nextEventId !== "number") return undefined;
      const allEvents: number[] = (Array.isArray((bootstrap as any).events) ? (bootstrap as any).events : [])
        .map((e:any)=> e.id)
        .filter((id:any)=> typeof id === 'number' && id >= nextEventId)
        .sort((a:number,b:number)=> a-b);
      const teamFx = (teamFixtures[teamId] || []).filter((fx: any) => typeof fx.event === "number");
      const counts: number[] = [];
      for (let i=0; i<Math.min(10, allEvents.length); i++) {
        const ev = allEvents[i];
        counts.push(teamFx.filter((fx:any)=> fx.event === ev).length);
      }
      return counts;
    })();
    const nextWeekFactor = eventFactors[0] ?? (fixtureWeights[0]?.factor ?? 1);
    const nextEventFixtureCount = eventFixtureCounts?.[0];

    const projectionBase = estimateProjectionBase({
      officialExpectedPoints: baseExp,
      pointsPerAppearance: officialPointsPerGame,
      starts,
      minutes: recentMinutes,
      teamMatchesPlayed,
      fixtureFactor: nextWeekFactor,
      fixtureCount: nextEventFixtureCount ?? (nextFixtures.length > 0 ? 1 : 0),
    });

    // Enhanced form factor combining player form, team form, and recent points
    const normForm = Math.max(0, Math.min(10, formVal));
    const playerFormFactor = 0.92 + 0.14 * (normForm / 10); // 0.92 to 1.06
    
    // Team form factor (helps players from in-form teams)
    const teamFormFactor = 0.97 + 0.06 * (teamForm / 10); // 0.97 to 1.03
    
    // Recent points momentum (if player scoring more than expected)
    const momentumFactor = (() => {
      if (baseExp < 0.1 || pointsPerGame < 0.1) return 1.0;
      const ratio = pointsPerGame / Math.max(0.1, baseExp);
      // Boost players overperforming, slight penalty for underperforming
      if (ratio > 1.25) return 1.05; // hot streak
      if (ratio > 1.15) return 1.025; // good run
      if (ratio < 0.8) return 0.95; // cold streak
      return 1.0;
    })();
    
    // Cap combined form factor at reasonable limits (prevent runaway multipliers)
    const rawFormFactor = playerFormFactor * teamFormFactor * momentumFactor;
    // A zero preseason form value means "no current-season sample", not bad
    // form. Keep it neutral until at least one team match has been played.
    const formFactor = teamMatchesPlayed === 0
      ? 1
      : Math.max(0.85, Math.min(1.12, rawFormFactor)); // Cap at 0.85-1.12x

    // Availability is applied exactly once inside usage-v2.
    const minutesFactor = playingTime.factor;

    // Position-aware scaling
    const positionFactor = calib.posFactor[position] ?? 1;
    
    // Official FPL penalty order follows current clubs and transfers.
    const rawPenaltyOrder = Number(el.penalties_order);
    const penaltyTakerRank = Number.isInteger(rawPenaltyOrder) && rawPenaltyOrder > 0
      ? rawPenaltyOrder - 1
      : undefined;
    let penaltyBoost = 1.0;
    if (penaltyTakerRank === 0) penaltyBoost = 1.08;      // primary taker
    else if (penaltyTakerRank === 1) penaltyBoost = 1.04; // secondary
    else if (penaltyTakerRank === 2) penaltyBoost = 1.02; // tertiary

    // Availability signals have already changed playingTime. Only performance
    // and set-piece signals are allowed to change productivity here.
    const signalMultiplier = performanceSignalMultiplier(playerSignals);

    // Availability is already represented by minutesFactor; do not apply a
    // second injury/status multiplier to the points projection.
    // Official ep_next already contains DGW accounting. The GW1 historical
    // component handles fixture count inside projectionBase before this point.
    const rawPrediction = projectionBase.points * positionFactor * calib.CAL * formFactor * penaltyBoost * minutesFactor * signalMultiplier;

    // Position-based realistic caps (prevent impossible predictions)
    // Scale caps by DGW fixture count so DGW predictions aren't clipped to single-GW levels
    const dgwCount = (typeof nextEventFixtureCount === 'number' && nextEventFixtureCount >= 2) ? nextEventFixtureCount : 1;
    const positionCapsBase: Record<Position, number> = {
      GK: 6.5,   // Goalkeepers rarely score above this in expectation
      DEF: 9.0,  // Defenders cap in expectation
      MID: 11.0, // Midfielders cap in expectation
      FWD: 12.0, // Forwards cap in expectation
    };
    const maxAllowed = positionCapsBase[position] * dgwCount;
    
    // Apply cap and round
    const refined = Math.max(0, Math.min(maxAllowed, Math.round(rawPrediction * 10) / 10));

    // Use web_name from FPL API - this is the official display name shown in the game
    // web_name matches exactly what appears on fantasy.premierleague.com
    const name = el.web_name || el.second_name || `${el.first_name || ""} ${el.second_name || ""}`.trim();
    const photo = el.code ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${el.code}.png` : undefined;

    // EO risk (differential impact)
    const ownPctClamped = typeof ownership === 'number' ? Math.max(0, Math.min(100, ownership)) : undefined;
    const eoRisk = typeof ownPctClamped === 'number' ? Math.round(refined * (1 - ownPctClamped / 100) * 10) / 10 : undefined;

    const p: Player = {
      id: String(el.id),
      name,
      position,
      team,
      teamName: teamName[teamId] || team,
      price,
      expPoints: refined,
      baseExp,
      form: formVal,
      minutesProb,
      playingTime,
      nextFixtures,
      status: mapStatus(statusCode),
      ownership,
      photo,
      eoRisk,
      priceChangeEvent,
      transfersInEvent,
      transfersOutEvent,
      expExplain: {
        base: projectionBase.points,
        officialBase: baseExp,
        projectionBaseSource: projectionBase.source,
        historicalPointsPerGame: officialPointsPerGame || undefined,
        historicalWeight: projectionBase.historicalWeight || undefined,
        historicalFixturePoints: projectionBase.historicalFixturePoints || undefined,
        minutesProb,
        minutesFactor,
        injuryPenalty: 1,
        modelVersion: 'usage-v2',
        playingTime,
        form: formVal,
        formFactor,
        positionFactor,
        penaltyBoost,
        penaltyTakerRank,
        calibration: calib.CAL,
        // Status metadata for UI
        rawStatus: statusCode,
        chance,
        news: el.news || "",
        newsAdded: el.news_added || "",
        fixtureWeights,
        nextWeekFactor,
        eventFactors,
        blendedFixtureFactor,
        eventFixtureCounts,
        nextEventFixtureCount,
        signals: playerSignals.length > 0 ? playerSignals.map((s: SignalRow) => ({
          signal: s.signal,
          adjustment: s.adjustment,
          confidence: s.confidence,
          reason: s.reason,
          sourceType: s.source_type,
        })) : undefined,
        signalMultiplier: playerSignals.length > 0 ? signalMultiplier : undefined,
        baseEvent: typeof nextEventId === 'number' ? nextEventId : undefined,
        source: 'fpl',
        final: refined,
      },
    };
    return p;
  });

  return players;
}
