import browserSources from '../../config/browser-sources.json';
import { MAX_CONTENT_AGE_DAYS } from './sources';
import type { ScrapedContent } from './scrapers';

export interface BrowserPackItem {
  sourceId: string;
  url: string;
  title?: string;
  publishedAt?: string | null;
  retrievedAt: string;
  text: string;
}

export interface BrowserPack {
  schemaVersion: 1;
  profile: string;
  generatedAt: string;
  items: BrowserPackItem[];
}

type BrowserSourceDefinition = (typeof browserSources.sources)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Browser pack ${field} must be a non-empty string`);
  }
  return value.trim();
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`Browser pack ${field} is not a valid date`);
  return date;
}

function sourceById(sourceId: string): BrowserSourceDefinition {
  const source = browserSources.sources.find((candidate) => candidate.id === sourceId);
  if (!source) throw new Error(`Browser pack source is not allow-listed: ${sourceId}`);
  return source;
}

function assertAllowedUrl(source: BrowserSourceDefinition, rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Browser pack URL is invalid: ${rawUrl}`);
  }
  if (url.protocol !== 'https:') throw new Error(`Browser pack URL must use HTTPS: ${rawUrl}`);
  if (!source.allowedHosts.includes(url.hostname)) {
    throw new Error(`Browser pack URL host is not allow-listed for ${source.id}: ${url.hostname}`);
  }
  if (!source.allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    throw new Error(`Browser pack URL path is not allow-listed for ${source.id}: ${url.pathname}`);
  }
  return url;
}

/**
 * Validate a pack produced by the local Fpl browser and convert it to the
 * common content shape used by the existing signal extractor.
 */
export function readBrowserPack(value: unknown, now = new Date()): ScrapedContent[] {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error('Browser pack schemaVersion must be 1');
  }
  if (value.profile !== browserSources.profile) {
    throw new Error(`Browser pack must come from the ${browserSources.profile} browser profile`);
  }
  const generatedAt = asNonEmptyString(value.generatedAt, 'generatedAt');
  const generatedDate = parseDate(generatedAt, 'generatedAt');
  if (generatedDate.getTime() > now.getTime() + 5 * 60_000) {
    throw new Error('Browser pack generatedAt is in the future');
  }
  if (!Array.isArray(value.items)) throw new Error('Browser pack items must be an array');

  const cutoff = new Date(now.getTime() - MAX_CONTENT_AGE_DAYS * 24 * 60 * 60_000);
  const seen = new Set<string>();
  const content: ScrapedContent[] = [];

  for (const rawItem of value.items) {
    if (!isRecord(rawItem)) throw new Error('Browser pack item must be an object');
    const sourceId = asNonEmptyString(rawItem.sourceId, 'item.sourceId');
    const source = sourceById(sourceId);
    const rawUrl = asNonEmptyString(rawItem.url, 'item.url');
    const url = assertAllowedUrl(source, rawUrl);
    const retrievedAt = asNonEmptyString(rawItem.retrievedAt, 'item.retrievedAt');
    const retrievedDate = parseDate(retrievedAt, 'item.retrievedAt');
    const publishedAt = typeof rawItem.publishedAt === 'string' && rawItem.publishedAt.trim()
      ? rawItem.publishedAt.trim()
      : null;
    const effectiveDate = publishedAt ? parseDate(publishedAt, 'item.publishedAt') : retrievedDate;
    const text = asNonEmptyString(rawItem.text, 'item.text');
    const title = typeof rawItem.title === 'string' ? rawItem.title.trim() : '';
    if (retrievedDate.getTime() > now.getTime() + 5 * 60_000) throw new Error(`Browser pack item is from the future: ${rawUrl}`);
    if (effectiveDate < cutoff || effectiveDate.getTime() > now.getTime() + 5 * 60_000) continue;
    if (text.length < 50) continue;

    const key = `${sourceId}|${url.toString()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    content.push({
      source: source.label,
      sourceType: 'browser',
      text: title ? `${title}\n${text}` : text,
      date: effectiveDate.toISOString(),
      url: url.toString(),
    });
  }

  return content;
}

export { browserSources };
