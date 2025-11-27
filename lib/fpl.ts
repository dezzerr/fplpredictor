import type { Player, Position, Fixture } from "@/lib/data";
import { getCalibration, type CalPresetName } from "@/lib/calibration";
import {
  FPL_POSITION_MAP,
  TEAM_STRENGTH,
  PENALTY_TAKERS,
} from "@/lib/constants";

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

  // Fetch fixtures best-effort (tolerate failures by using empty list)
  let fixtures: any[] = [];
  try {
    const fixturesRes = await fetch("https://fantasy.premierleague.com/api/fixtures/?future=1", { next: { revalidate: 900 } });
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

  const teams: Array<{ id: number; short_name: string; name: string }> = bootstrap.teams || [];
  const teamShort: Record<number, string> = Object.fromEntries(
    teams.map((t: any) => [t.id, t.short_name])
  );

  // Determine the next event id to prioritize very near fixtures
  const events: Array<any> = bootstrap.events || [];
  const nextEvent = events.find((e) => e.is_next) || events.find((e) => e.is_current) || events.find((e) => !e.finished);
  const nextEventId: number | undefined = nextEvent?.id;
  
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

  // Build team form map (recent results) - use team strength for now, enhance later with API
  const teamFormMap: Record<number, number> = {};
  for (const t of teams) {
    // Use team strength metrics from bootstrap as proxy for form
    const homeStr = (t as any).strength_overall_home || 1000;
    const awayStr = (t as any).strength_overall_away || 1000;
    const avgStr = (homeStr + awayStr) / 2;
    // Normalize to 0-10 scale (1000-1500 typical range)
    teamFormMap[t.id] = Math.max(0, Math.min(10, (avgStr - 1000) / 50));
  }

  const players: Player[] = elements.map((el: any) => {
    const teamId: number = el.team;
    const team = teamShort[teamId] || "UNK";
    const position: Position = FPL_POSITION_MAP[el.element_type as number];
    const price = (el.now_cost ?? 0) / 10;
    const baseExp = parseFloat(el.ep_next ?? "0") || 0;
    const formVal = parseFloat(el.form ?? "0") || 0;
    const statusCode: string = el.status || "u";
    const chance: number | null = typeof el.chance_of_playing_next_round === "number" ? el.chance_of_playing_next_round : null;
    
    // Enhanced minutes probability based on ACTUAL playing time this season
    let minutesProb: number;
    const recentMinutes = parseInt(el.minutes ?? "0") || 0; // total minutes this season
    const ownPct = parseFloat(el.selected_by_percent ?? "0") || 0;
    // Derive games played so far from the next event id (GW index)
    const gamesSoFar = typeof nextEventId === 'number' ? Math.max(1, nextEventId - 1) : 10;
    const avgMinutesPerGame = recentMinutes / Math.max(1, gamesSoFar);
    
    // Get player's recent points (last 3-5 games average)
    const totalPoints = parseFloat(el.total_points ?? "0") || 0;
    const pointsPerGame = totalPoints / Math.max(1, gamesSoFar);
    
    // Get team strength and form
    const teamStrength = TEAM_STRENGTH[team] || 3;
    const teamForm = teamFormMap[teamId] || 5;

    // Check for loan/transfer news first (overrides everything)
    const news = (el.news ?? "").toLowerCase();
    if (news.includes('loan') || news.includes('transfer') || news.includes('joined')) {
      minutesProb = 0.05; // Essentially unavailable
    } else {
      // Base probability from season average minutes (slightly more generous)
      let baseProb: number;
      if (avgMinutesPerGame >= 75) baseProb = 0.95;        // nailed starter
      else if (avgMinutesPerGame >= 65) baseProb = 0.88;   // regular starter
      else if (avgMinutesPerGame >= 50) baseProb = 0.75;   // frequent starter
      else if (avgMinutesPerGame >= 35) baseProb = 0.60;   // rotation risk
      else if (avgMinutesPerGame >= 20) baseProb = 0.40;   // super-sub
      else if (avgMinutesPerGame >= 10) baseProb = 0.25;   // fringe
      else baseProb = 0.15;                                // bench warmer

      // Blend with FPL's chance_of_playing when present (do not let it dominate)
      if (chance !== null) {
        const chanceDec = Math.max(0, Math.min(1, chance / 100));
        baseProb = 0.6 * baseProb + 0.4 * chanceDec;
      }

      // Status adjustments
      if (statusCode === 'd') baseProb = Math.min(baseProb, 0.75);
      if (statusCode !== 'a' && statusCode !== 'd' && statusCode !== 'u') baseProb *= 0.25; // injured/suspended

      // Form adjustment - poor form increases rotation risk especially for non-starters
      if (formVal < 1.5 && avgMinutesPerGame < 60) baseProb *= 0.85;

      // Very low ownership + low minutes => out of favor
      if (ownPct < 1.0 && avgMinutesPerGame < 45) baseProb *= 0.85;

      minutesProb = Math.max(0.05, Math.min(0.95, baseProb));
    }
    const ownership = ownPct || undefined;

    // Build nextFixtures: take first three upcoming for the player's team, compute opp and diff for that team side
    const tf = (teamFixtures[teamId] || []).slice(0, 3);
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
      const oppStrength = TEAM_STRENGTH[opp] || 3;
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
      for (let i=0; i<Math.min(3, allEvents.length); i++) {
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
          const oppStrength = TEAM_STRENGTH[oppTeam] || 3;
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
      for (let i=0; i<Math.min(3, allEvents.length); i++) {
        const ev = allEvents[i];
        counts.push(teamFx.filter((fx:any)=> fx.event === ev).length);
      }
      return counts;
    })();
    const nextWeekFactor = eventFactors[0] ?? (fixtureWeights[0]?.factor ?? 1);
    const nextEventFixtureCount = eventFixtureCounts?.[0];

    // Enhanced form factor combining player form, team form, and recent points
    const normForm = Math.max(0, Math.min(10, formVal));
    const playerFormFactor = 0.90 + 0.20 * (normForm / 10); // 0.90 to 1.10 (more conservative)
    
    // Team form factor (helps players from in-form teams)
    const teamFormFactor = 0.95 + 0.10 * (teamForm / 10); // 0.95 to 1.05 (reduced impact)
    
    // Recent points momentum (if player scoring more than expected)
    const momentumFactor = (() => {
      if (baseExp < 0.1 || pointsPerGame < 0.1) return 1.0;
      const ratio = pointsPerGame / Math.max(0.1, baseExp);
      // Boost players overperforming, slight penalty for underperforming
      if (ratio > 1.25) return 1.08; // hot streak (reduced from 1.10)
      if (ratio > 1.15) return 1.04; // good run (reduced from 1.05)
      if (ratio < 0.8) return 0.96; // cold streak (less harsh)
      return 1.0;
    })();
    
    // Cap combined form factor at reasonable limits (prevent runaway multipliers)
    const rawFormFactor = playerFormFactor * teamFormFactor * momentumFactor;
    const formFactor = Math.max(0.80, Math.min(1.25, rawFormFactor)); // Cap at 0.80-1.25x

    // Minutes factor - scale points by playing time probability
    const minutesFactor = Math.max(0, Math.min(1.2, calib.minutes.base + calib.minutes.scale * minutesProb));
    let injuryPenalty = 1;
    if (statusCode === 'd' && minutesProb < 0.6) injuryPenalty = calib.injury.flaggedLowMin;
    if (statusCode !== 'a' && statusCode !== 'd' && statusCode !== 'u') injuryPenalty = calib.injury.severe;

    // Position-aware scaling
    const positionFactor = calib.posFactor[position] ?? 1;
    
    // Penalty taker boost using curated map (fallback to FPL field when available)
    const webName = el.web_name || el.second_name || "";
    const fullName = `${el.first_name || ""} ${el.second_name || ""}`.trim();
    const takers = PENALTY_TAKERS[team] || [];
    let penaltyTakerRank: number | undefined = undefined;
    for (let i = 0; i < takers.length; i++) {
      const key = takers[i].toLowerCase();
      if (webName.toLowerCase().includes(key) || fullName.toLowerCase().includes(key)) {
        penaltyTakerRank = i;
        break;
      }
    }
    let penaltyBoost = 1.0;
    if (penaltyTakerRank === 0) penaltyBoost = 1.15;      // primary taker
    else if (penaltyTakerRank === 1) penaltyBoost = 1.08; // secondary
    else if (penaltyTakerRank === 2) penaltyBoost = 1.04; // tertiary
    else {
      // Fallback to FPL's penalties_order if exposed
      const po = parseInt((el as any).penalties_order ?? "99") || 99;
      if (po === 1) penaltyBoost = 1.10;
    }

    // Apply ALL factors to expected points (form, minutes, penalties, injury)
    const rawPrediction = baseExp * positionFactor * calib.CAL * formFactor * penaltyBoost * minutesFactor * injuryPenalty;
    
    // Position-based realistic caps (prevent impossible predictions)
    const positionCaps: Record<Position, number> = {
      GK: 7.0,   // Goalkeepers rarely score above 7
      DEF: 10.0, // Defenders cap at 10 (clean sheet + attacking returns)
      MID: 12.0, // Midfielders cap at 12
      FWD: 14.0, // Forwards cap at 14 (hat-trick + bonus)
    };
    const maxAllowed = positionCaps[position];
    
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
      price,
      expPoints: refined,
      baseExp,
      form: formVal,
      minutesProb,
      nextFixtures,
      status: mapStatus(statusCode),
      ownership,
      photo,
      eoRisk,
      expExplain: {
        base: baseExp,
        minutesProb,
        minutesFactor,
        injuryPenalty,
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
        source: 'fpl',
        final: refined,
      },
    };
    return p;
  });

  return players;
}
