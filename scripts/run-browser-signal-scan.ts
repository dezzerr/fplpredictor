import { readFile } from 'node:fs/promises';
import { getConfiguredSupabaseServiceKey } from '@/lib/supabase/service-key';
import { readBrowserPack } from '@/lib/ai/browserPack';
import { fetchOfficialRoster, processSignalContent, upsertSignalRows } from '@/lib/ai/signalScan';

function getInputPath(): string {
  const index = process.argv.indexOf('--input');
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return process.env.BROWSER_NEWS_PACK || 'output/browser-news/browser-pack.json';
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = getConfiguredSupabaseServiceKey();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  if (!geminiKey) throw new Error('GEMINI_API_KEY is required');

  const inputPath = getInputPath();
  const pack = JSON.parse(await readFile(inputPath, 'utf8')) as unknown;
  const content = readBrowserPack(pack);
  const { gameweek, players } = await fetchOfficialRoster();
  console.log(JSON.stringify({
    phase: 'browser-collection',
    profile: 'Fpl',
    inputPath,
    gameweek,
    items: content.length,
    sources: [...new Set(content.map((item) => item.source))],
  }));
  if (!content.length) throw new Error('Browser pack contained no fresh allow-listed content');

  const processed = await processSignalContent(content, gameweek, players);
  const upserted = !dryRun && supabaseUrl && serviceRoleKey
    ? await upsertSignalRows(processed.rows, supabaseUrl, serviceRoleKey)
    : 0;

  console.log(JSON.stringify({
    phase: 'complete',
    gameweek,
    rawSignals: processed.rawSignals.length,
    matchedSignals: processed.matchedSignals.length,
    verifiedSignals: processed.rows.length,
    dryRun,
    upsertedSignals: upserted,
    signals: processed.rows,
  }));
}

main().catch((error) => {
  console.error(`[browser-signal-scan] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
