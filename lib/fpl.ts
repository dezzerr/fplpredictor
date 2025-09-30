import type { Player, Position, Fixture } from "@/lib/data";
import { getCalibration, type CalPresetName } from "@/lib/calibration";

// Map FPL numeric element_type to our Position
const POS_MAP: Record<number, Position> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

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

  const players: Player[] = elements.map((el: any) => {
    const teamId: number = el.team;
    const team = teamShort[teamId] || "UNK";
    const position: Position = POS_MAP[el.element_type as number];
    const price = (el.now_cost ?? 0) / 10;
    const baseExp = parseFloat(el.ep_next ?? "0") || 0;
    const formVal = parseFloat(el.form ?? "0") || 0;
    const statusCode: string = el.status || "u";
    const chance: number | null = typeof el.chance_of_playing_next_round === "number" ? el.chance_of_playing_next_round : null;
    
    // Enhanced minutes probability calculation accounting for current form and playing time
    let minutesProb: number;
    
    // Start with base probability from FPL chance or status
    let baseProb: number;
    if (chance !== null) {
      baseProb = Math.max(0, Math.min(1, chance / 100));
    } else {
      baseProb = statusCode === 'a' ? 0.95 : statusCode === 'd' ? 0.7 : statusCode === 'u' ? 0.85 : 0.4;
    }
    
    // Apply rotation risk adjustments regardless of FPL chance value
    const recentMinutes = parseInt(el.minutes ?? "0") || 0;
    const ownPct = parseFloat(el.selected_by_percent ?? "0") || 0;
    
    // Check for loan/transfer news first (overrides everything)
    const news = (el.news ?? "").toLowerCase();
    if (news.includes('loan') || news.includes('transfer') || news.includes('joined')) {
      minutesProb = 0.05; // Essentially unavailable if on loan/transferred
    } else {
      // Players with very low minutes likely not first choice (even if FPL says 100%)
      if (recentMinutes < 45) {
        baseProb = Math.min(baseProb, 0.6); // Cap at 60% for very low minutes
      } else if (recentMinutes < 90) {
        baseProb = Math.min(baseProb, 0.75); // Cap at 75% for low minutes
      }
      
      // Form factor - poor form suggests rotation risk
      if (formVal < 2.0 && recentMinutes < 90) {
        baseProb *= 0.85; // Reduce probability for poor form + low minutes
      }
      
      // Very low ownership often indicates the player is out of favor
      if (ownPct < 1.0 && recentMinutes < 60) {
        baseProb *= 0.8; // Reduce for very low ownership + minutes
      }
      
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

    // Fixture factors per fixture
    const fixtureWeights: Array<{ w: number; d: number; H: boolean; factor: number }> = (nextFixtures.length ? nextFixtures : [{ H: false, diff: 3, opp: "" } as any]).map((f, i) => {
      const d = f.diff ?? 3; // 1 easiest, 5 hardest
      const isHome = !!f.H;
      // Use calibrated difficulty/home impact
      const diffFactor = 1 + calib.fixtures.diffScale * (3 - d) / 3;
      const hb = calib.fixtures.homeBoost;
      const homeFactor = isHome ? hb : 1 / hb;
      return { w: weights[i] ?? 1, d, H: isHome, factor: diffFactor * homeFactor };
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
          const diffFactor = 1 + calib.fixtures.diffScale * (3 - d) / 3;
          const homeFactor = isHome ? hb : 1 / hb;
          factors.push(diffFactor * homeFactor);
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

    // Form factor
    const normForm = Math.max(0, Math.min(10, formVal));
    const formFactor = 1 + 0.2 * (normForm - 5) / 5; // ~0.8..1.2 across 0..10

    // Minutes and injury/rotation risk (calibrated)
    const minutesFactor = Math.max(0, Math.min(1.2, calib.minutes.base + calib.minutes.scale * minutesProb));
    let injuryPenalty = 1;
    if (statusCode === 'd' && minutesProb < 0.6) injuryPenalty = calib.injury.flaggedLowMin;
    if (statusCode !== 'a' && statusCode !== 'd' && statusCode !== 'u') injuryPenalty = calib.injury.severe; // suspended/injured/not in squad

    // Position-aware scaling (calibrated)
    const positionFactor = calib.posFactor[position] ?? 1;

    // Calibrate next GW EP directly from FPL ep_next (already includes minutes, form, difficulty)
    // Keep only mild global and position scaling to avoid double-counting
    const refined = Math.max(0, Math.round(
      baseExp * positionFactor * calib.CAL * 10
    ) / 10);

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
