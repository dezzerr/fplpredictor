import { withCache, oddsCache } from "@/lib/cache";
import { mapTeam, mapPlayer } from "@/lib/marketMapping";

// Types for odds data we plan to consume
export type FixtureKey = { home: string; away: string; event: number }; // team codes + GW/event #

export type TeamOdds = {
  fixture: FixtureKey;
  // Market-implied measures
  homeWin: number; // P(H)
  draw: number;    // P(D)
  awayWin: number; // P(A)
  goalLine?: number; // e.g., 2.5
  bttsYes?: number;  // P(BTTS)
};

export type GoalscorerOdds = {
  fixture: FixtureKey;
  playerId: string; // our internal Player.id
  anytime: number;  // probability of scoring at least once
};

// Fetch team odds for Premier League fixtures for a given event (gameweek offset)
export async function fetchTeamOdds(event: number): Promise<TeamOdds[]> {
  const hasProvider = Boolean(
    process.env.ODDS_API_KEY || process.env.API_FOOTBALL_KEY || process.env.BETFAIR_APP_KEY
  );
  if (!hasProvider) return [];

  try {
    // Use Odds API for Premier League
    if (process.env.ODDS_API_KEY) {
      const baseUrl = 'https://api.the-odds-api.com/v4';
      const sport = 'soccer_epl'; // Premier League
      const regions = 'uk,eu'; // European bookmakers
      const markets = 'h2h'; // Head-to-head (1x2)
      const oddsFormat = 'decimal';
      
      const url = `${baseUrl}/sports/${sport}/odds?apiKey=${process.env.ODDS_API_KEY}&regions=${regions}&markets=${markets}&oddsFormat=${oddsFormat}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        console.warn(`Odds API returned ${response.status}: ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      return parseTeamOddsFromAPI(data, event);
    }
    
    return [];
  } catch (error) {
    console.warn('Failed to fetch team odds:', error);
    return [];
  }
}

// Fetch anytime goalscorer odds for Premier League for a given event
export async function fetchGoalscorerOdds(event: number): Promise<GoalscorerOdds[]> {
  // NOTE: Odds API doesn't support player goalscorer markets for soccer
  // Return empty array to fall back to team-level goal distribution
  return [];
}

// Example helper: cached fetch wrapper (keyed by route + event)
export async function cachedTeamOdds(event: number): Promise<TeamOdds[]> {
  return withCache(oddsCache, `teamOdds:${event}`, () => fetchTeamOdds(event));
}

export async function cachedGoalscorerOdds(event: number): Promise<GoalscorerOdds[]> {
  return withCache(oddsCache, `scorerOdds:${event}`, () => fetchGoalscorerOdds(event));
}

// Parse team odds from Odds API response
function parseTeamOddsFromAPI(apiData: any, event: number): TeamOdds[] {
  const teamOdds: TeamOdds[] = [];
  
  if (!Array.isArray(apiData)) return teamOdds;
  
  for (const game of apiData) {
    if (!game.bookmakers || game.bookmakers.length === 0) continue;
    
    // Map team names to our internal codes
    const home = mapTeam(game.home_team);
    const away = mapTeam(game.away_team);
    
    if (!home || !away) continue;
    
    // Get average odds across bookmakers for h2h market
    const h2hMarkets = [];
    for (const bookmaker of game.bookmakers) {
      const h2hMarket = bookmaker.markets.find((m: any) => m.key === 'h2h');
      if (h2hMarket && h2hMarket.outcomes && h2hMarket.outcomes.length === 3) {
        h2hMarkets.push(h2hMarket.outcomes);
      }
    }
    
    if (h2hMarkets.length === 0) continue;
    
    // Average the odds and convert to probabilities
    let homeOddsSum = 0, drawOddsSum = 0, awayOddsSum = 0;
    for (const outcomes of h2hMarkets) {
      const homeOutcome = outcomes.find((o: any) => o.name === game.home_team);
      const drawOutcome = outcomes.find((o: any) => o.name === 'Draw');
      const awayOutcome = outcomes.find((o: any) => o.name === game.away_team);
      
      if (homeOutcome) homeOddsSum += homeOutcome.price;
      if (drawOutcome) drawOddsSum += drawOutcome.price;
      if (awayOutcome) awayOddsSum += awayOutcome.price;
    }
    
    const avgHomeOdds = homeOddsSum / h2hMarkets.length;
    const avgDrawOdds = drawOddsSum / h2hMarkets.length;
    const avgAwayOdds = awayOddsSum / h2hMarkets.length;
    
    // Convert decimal odds to probabilities (remove bookmaker margin)
    const homeProb = 1 / avgHomeOdds;
    const drawProb = 1 / avgDrawOdds;
    const awayProb = 1 / avgAwayOdds;
    const totalProb = homeProb + drawProb + awayProb;
    
    teamOdds.push({
      fixture: { home, away, event },
      homeWin: homeProb / totalProb,
      draw: drawProb / totalProb,
      awayWin: awayProb / totalProb,
      goalLine: 2.6, // Add default goal line for lambda calculations
    });
  }
  
  return teamOdds;
}

// Parse goalscorer odds from Odds API response
function parseGoalscorerOddsFromAPI(apiData: any, event: number): GoalscorerOdds[] {
  const scorerOdds: GoalscorerOdds[] = [];
  
  if (!Array.isArray(apiData)) return scorerOdds;
  
  for (const game of apiData) {
    if (!game.bookmakers || game.bookmakers.length === 0) continue;
    
    // Map team names to our internal codes
    const home = mapTeam(game.home_team);
    const away = mapTeam(game.away_team);
    
    if (!home || !away) continue;
    
    // Get goalscorer markets
    const scorerMarkets = [];
    for (const bookmaker of game.bookmakers) {
      const scorerMarket = bookmaker.markets.find((m: any) => m.key === 'player_anytime_goalscorer');
      if (scorerMarket && scorerMarket.outcomes) {
        scorerMarkets.push(scorerMarket.outcomes);
      }
    }
    
    if (scorerMarkets.length === 0) continue;
    
    // Process each player's odds
    const playerOddsMap = new Map<string, number[]>();
    
    for (const outcomes of scorerMarkets) {
      for (const outcome of outcomes) {
        const playerName = outcome.name;
        const playerId = mapPlayer(playerName, home) || mapPlayer(playerName, away);
        
        if (playerId && outcome.price) {
          if (!playerOddsMap.has(playerId)) {
            playerOddsMap.set(playerId, []);
          }
          playerOddsMap.get(playerId)!.push(outcome.price);
        }
      }
    }
    
    // Average odds for each player and convert to probabilities
    for (const [playerId, oddsList] of playerOddsMap) {
      const avgOdds = oddsList.reduce((sum, odds) => sum + odds, 0) / oddsList.length;
      const probability = 1 / avgOdds; // Convert to probability
      
      scorerOdds.push({
        fixture: { home, away, event },
        playerId,
        anytime: probability,
      });
    }
  }
  
  return scorerOdds;
}
