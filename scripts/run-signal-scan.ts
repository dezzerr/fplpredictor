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
import { extractSignals } from '@/lib/ai/gemini';
import { matchSignalsToPlayers, type SignalPlayer } from '@/lib/ai/matching';
import { prepareSignalRows } from '@/lib/ai/signalRows';
import { buildFactPacks } from '@/lib/ai/factPack';
import { fetchOfficialPlanningData, planningFacts } from '@/lib/ai/officialFpl';
import { buildScanDiagnostics, scanWindowFor } from '@/lib/ai/diagnostics';
import { buildDraftBundle } from '@/lib/ai/draftGeneration';
import { getConfiguredSupabaseServiceKey } from '@/lib/supabase/service-key';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type SourceResult = {
  source: string;
  content: ScrapedContent[];
  error?: string;
};

async function fetchRoster(): Promise<{ gameweek: number; players: SignalPlayer[] }> {
  const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`FPL bootstrap failed with HTTP ${response.status}`);

  const bootstrap = await response.json() as {
    events?: Array<{ id: number; is_next?: boolean; is_current?: boolean }>;
    teams?: Array<{ id: number; short_name: string }>;
    elements?: Array<{ id: number; team: number; web_name: string; first_name: string; second_name: string }>;
  };
  const next = bootstrap.events?.find((event) => event.is_next);
  const current = bootstrap.events?.find((event) => event.is_current);
  const gameweek = next?.id ?? current?.id;
  if (!gameweek) throw new Error('Could not determine the planning Gameweek');
  const teams = new Map((bootstrap.teams || []).map(team => [team.id, team.short_name]));
  const players = (bootstrap.elements || []).filter(player => teams.has(player.team)).map(player => ({
    id: String(player.id), name: player.web_name, team: teams.get(player.team)!,
    aliases: [`${player.first_name} ${player.second_name}`],
  }));
  if (!players.length) throw new Error('Official FPL roster was empty');
  return { gameweek, players };
}

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

  const { gameweek, players } = await fetchRoster();
  const sourceResults = await collectSources();
  const allContent = sourceResults.flatMap((result) => result.content);
  let officialFacts = [] as Awaited<ReturnType<typeof planningFacts>>;
  let officialDeadline: string | null = null;
  try {
    const official = await fetchOfficialPlanningData();
    officialFacts = planningFacts(official);
    officialDeadline = official.deadline;
    console.log(JSON.stringify({ phase: 'official-planning', gameweek: official.gameweek, facts: officialFacts.length, deadline: officialDeadline }));
  } catch (error) {
    console.warn(`[signal-scan] Official planning facts unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }

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

  const rawSignals = await extractSignals(allContent, { gameweek, players });
  const matched = matchSignalsToPlayers(rawSignals, players);
  const rows = prepareSignalRows(matched, allContent, gameweek);
  const factPacks = buildFactPacks(gameweek, allContent, rows, officialFacts, officialDeadline);
  const diagnostics = buildScanDiagnostics(gameweek, allContent, factPacks, sourceResults.filter((result) => result.error).map((result) => ({ source: result.source, error: result.error! })), officialDeadline);
  const drafts = buildDraftBundle(factPacks);
  const outputDir = join(process.cwd(), 'output', 'content-engine', `gameweek-${gameweek}`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'fact-packs.json'), JSON.stringify({ packs: factPacks, diagnostics }, null, 2));
  for (const draft of drafts) await writeFile(join(outputDir, `${draft.slug}.md`), draft.content);
  console.log(JSON.stringify({ phase: 'content-engine-output', outputDir, drafts: drafts.length, scanWindow: scanWindowFor(new Date(), officialDeadline ? new Date(officialDeadline) : null) }));
  let upserted = 0;

  if (!dryRun && rows.length) {
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // One atomic write: a failed batch cannot leave a partially applied scan.
    const { data, error } = await supabase.from('player_signals').upsert(rows, {
      onConflict: 'player_name,team,gameweek,signal',
    }).select('player_id');
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    upserted = data?.length || 0;
    if (upserted !== rows.length) throw new Error('Supabase returned an unexpected signal count');
  }

  console.log(JSON.stringify({
    phase: 'fact-packs',
    packs: factPacks.map(({ kind, sourceItems, sourceLabels, verifiedFacts, articleReady, emailReady, missing }) => ({
      kind, sourceItems, sourceLabels, verifiedFacts, articleReady, emailReady, missing,
    })),
  }));

  console.log(JSON.stringify({ phase: 'verified-signals', dryRun, signals: rows }));

  console.log(JSON.stringify({
    phase: 'complete',
    gameweek,
    rawSignals: rawSignals.length,
    matchedSignals: matched.length,
    verifiedSignals: rows.length,
    dryRun,
    upsertedSignals: upserted,
  }));
}

main().catch((error) => {
  console.error(`[signal-scan] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
