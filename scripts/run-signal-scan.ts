import { createClient } from '@supabase/supabase-js';
import {
  ARTICLE_SOURCES,
  TWITTER_SOURCES,
  YOUTUBE_SOURCES,
} from '@/lib/ai/sources';
import {
  fetchArticles,
  fetchTweets,
  fetchYouTubeTranscripts,
  type ScrapedContent,
} from '@/lib/ai/scrapers';
import { fetchOfficialRoster, processSignalContent, upsertSignalRows } from '@/lib/ai/signalScan';
import { getConfiguredSupabaseServiceKey } from '@/lib/supabase/service-key';

type SourceResult = {
  source: string;
  content: ScrapedContent[];
  error?: string;
};

async function collectSources(): Promise<SourceResult[]> {
  const results: SourceResult[] = [];

  await Promise.all([
    ...YOUTUBE_SOURCES.map(async (source) => {
      try {
        results.push({ source: source.label, content: await fetchYouTubeTranscripts(source) });
      } catch (error) {
        results.push({ source: source.label, content: [], error: String(error) });
      }
    }),
    ...ARTICLE_SOURCES.map(async (source) => {
      try {
        results.push({ source: source.label, content: await fetchArticles(source) });
      } catch (error) {
        results.push({ source: source.label, content: [], error: String(error) });
      }
    }),
    ...TWITTER_SOURCES.map(async (source) => {
      try {
        results.push({ source: source.label, content: await fetchTweets(source) });
      } catch (error) {
        results.push({ source: source.label, content: [], error: String(error) });
      }
    }),
  ]);

  return results;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = getConfiguredSupabaseServiceKey();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const dryRun = process.argv.includes('--dry-run');

  if (!dryRun && (!supabaseUrl || !supabaseKey)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const { gameweek, players } = await fetchOfficialRoster();
  const sourceResults = await collectSources();
  const allContent = sourceResults.flatMap((result) => result.content);

  console.log(JSON.stringify({
    phase: 'collection',
    gameweek,
    sources: sourceResults.map((result) => ({
      source: result.source,
      items: result.content.length,
      error: result.error,
    })),
    totalContent: allContent.length,
  }));

  if (allContent.length === 0) {
    throw new Error('No source content was collected');
  }

  const processed = await processSignalContent(allContent, gameweek, players);
  const upserted = !dryRun && supabaseUrl && supabaseKey
    ? await upsertSignalRows(processed.rows, supabaseUrl, supabaseKey)
    : 0;

  console.log(JSON.stringify({
    phase: 'verified-signals',
    dryRun,
    signals: processed.rows,
  }));

  console.log(JSON.stringify({
    phase: 'complete',
    gameweek,
    rawSignals: processed.rawSignals.length,
    matchedSignals: processed.matchedSignals.length,
    verifiedSignals: processed.rows.length,
    dryRun,
    upsertedSignals: upserted,
  }));
}

main().catch((error) => {
  console.error(`[signal-scan] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
