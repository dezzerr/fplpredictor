import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  YOUTUBE_SOURCES,
  ARTICLE_SOURCES,
  TWITTER_SOURCES,
} from '@/lib/ai/sources';
import {
  fetchYouTubeTranscripts,
  fetchArticles,
  fetchTweets,
  type ScrapedContent,
} from '@/lib/ai/scrapers';
import { extractSignals } from '@/lib/ai/gemini';
import { GeminiParseError } from '@/lib/ai/parseGeminiResponse';
import { matchSignalsToPlayers } from '@/lib/ai/matching';
import { fetchFplPlayers } from '@/lib/fpl';

/**
 * POST /api/signals/scan
 * Triggers a full source scan → Gemini extraction → Supabase upsert.
 * Protected by SCAN_SECRET header or query param.
 */
export async function POST(request: Request) {
  // Auth check
  const secret = process.env.SCAN_SECRET;
  if (secret) {
    const { searchParams } = new URL(request.url);
    const headerToken = request.headers.get('x-scan-secret');
    const queryToken = searchParams.get('secret');
    if (headerToken !== secret && queryToken !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 },
    );
  }

  // Determine current gameweek from FPL API
  let gameweek: number;
  try {
    const bootstrapRes = await fetch(
      'https://fantasy.premierleague.com/api/bootstrap-static/',
      { cache: 'no-store' },
    );
    const bootstrap = await bootstrapRes.json();
    const events: any[] = bootstrap.events || [];
    const next = events.find((e: any) => e.is_next);
    const current = events.find((e: any) => e.is_current);
    gameweek = next?.id || current?.id || 1;
  } catch {
    return NextResponse.json(
      { error: 'Could not determine gameweek' },
      { status: 500 },
    );
  }

  console.log(`[Scan] Starting scan for GW${gameweek}...`);

  // 1. Scrape all sources in parallel
  const [ytResults, articleResults, tweetResults] = await Promise.all([
    Promise.all(YOUTUBE_SOURCES.map(fetchYouTubeTranscripts)).then(r => r.flat()),
    Promise.all(ARTICLE_SOURCES.map(fetchArticles)).then(r => r.flat()),
    Promise.all(TWITTER_SOURCES.map(fetchTweets)).then(r => r.flat()),
  ]);

  const allContent: ScrapedContent[] = [
    ...ytResults,
    ...articleResults,
    ...tweetResults,
  ];

  console.log(
    `[Scan] Scraped ${ytResults.length} YT transcripts, ${articleResults.length} articles, ${tweetResults.length} tweets`,
  );

  if (allContent.length === 0) {
    return NextResponse.json({
      gameweek,
      signalsFound: 0,
      message: 'No content scraped. Check your source configuration in lib/ai/sources.ts',
    });
  }

  // 2. Extract signals via Gemini
  let rawSignals;
  try {
    rawSignals = await extractSignals(allContent);
  } catch (err) {
    if (err instanceof GeminiParseError) {
      console.error('[Scan] Gemini parse error:', err.message);
      console.error('[Scan] Raw response preview:', err.rawPreview);
      return NextResponse.json({ error: 'Failed to parse Gemini response' }, { status: 500 });
    }
    const msg = (err as Error).message || 'Unknown extraction error';
    console.error('[Scan] Gemini extraction error:', msg);
    return NextResponse.json({ error: `Gemini extraction failed: ${msg}` }, { status: 500 });
  }
  console.log(`[Scan] Gemini extracted ${rawSignals.length} raw signals`);

  if (rawSignals.length === 0) {
    return NextResponse.json({
      gameweek,
      signalsFound: 0,
      message: 'No player signals found in scraped content',
    });
  }

  // 3. Match signals to FPL player IDs
  const players = await fetchFplPlayers();
  const matched = matchSignalsToPlayers(rawSignals, players);
  console.log(`[Scan] Matched ${matched.length}/${rawSignals.length} signals to players`);

  // 4. Upsert to Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);
  let upserted = 0;

  for (const sig of matched) {
    const { error } = await supabase.from('player_signals').upsert(
      {
        player_name: sig.playerName,
        player_id: sig.playerId,
        team: sig.team,
        gameweek,
        signal: sig.signal,
        adjustment: sig.adjustment,
        confidence: sig.confidence,
        reason: sig.reason,
        source_type: allContent.find(c =>
          c.text.toLowerCase().includes(sig.playerName.toLowerCase()),
        )?.sourceType || 'article',
        source_label: allContent.find(c =>
          c.text.toLowerCase().includes(sig.playerName.toLowerCase()),
        )?.source || 'Unknown',
      },
      { onConflict: 'player_name,team,gameweek,signal' },
    );

    if (error) {
      console.warn(`[Scan] Upsert error for ${sig.playerName}:`, error.message);
    } else {
      upserted++;
    }
  }

  console.log(`[Scan] Upserted ${upserted} signals for GW${gameweek}`);

  return NextResponse.json({
    gameweek,
    scraped: {
      youtube: ytResults.length,
      articles: articleResults.length,
      tweets: tweetResults.length,
    },
    signalsExtracted: rawSignals.length,
    signalsMatched: matched.length,
    signalsUpserted: upserted,
  });
}
