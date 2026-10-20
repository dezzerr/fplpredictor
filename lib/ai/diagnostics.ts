import type { FactPack } from './factPack';
import type { ScrapedContent } from './scrapers';

export interface ScanDiagnostics {
  gameweek: number;
  generatedAt: string;
  sourceCoverage: Array<{ source: string; items: number; characters: number; urls: number; error?: string }>;
  categoryCounts: Record<string, number>;
  packs: Array<{ kind: string; verifiedFacts: number; articleReady: boolean; emailReady: boolean }>;
  deadline?: string | null;
}

export function buildScanDiagnostics(gameweek: number, content: ScrapedContent[], packs: FactPack[], errors: Array<{ source: string; error: string }> = [], deadline: string | null = null): ScanDiagnostics {
  const bySource = new Map<string, ScrapedContent[]>();
  for (const item of content) bySource.set(item.source, [...(bySource.get(item.source) ?? []), item]);
  const sourceCoverage: ScanDiagnostics['sourceCoverage'] = [...bySource.entries()].map(([source, items]) => ({ source, items: items.length, characters: items.reduce((sum, item) => sum + item.text.length, 0), urls: items.filter((item) => Boolean(item.url)).length }));
  for (const error of errors) sourceCoverage.push({ source: error.source, items: 0, characters: 0, urls: 0, error: error.error });
  const categoryCounts: Record<string, number> = {};
  for (const pack of packs) for (const fact of pack.facts) {
    const category = 'category' in fact ? fact.category : fact.signal;
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }
  return { gameweek, generatedAt: new Date().toISOString(), sourceCoverage, categoryCounts, packs: packs.map((pack) => ({ kind: pack.kind, verifiedFacts: pack.verifiedFacts, articleReady: pack.articleReady, emailReady: pack.emailReady })), deadline };
}

export type ScanWindow = 'planning' | 'availability' | 'deadline';
export function scanWindowFor(now: Date, deadline: Date | null): ScanWindow {
  if (!deadline) return 'planning';
  const hours = (deadline.getTime() - now.getTime()) / 3_600_000;
  if (hours <= 2) return 'deadline';
  if (hours <= 48) return 'availability';
  return 'planning';
}
