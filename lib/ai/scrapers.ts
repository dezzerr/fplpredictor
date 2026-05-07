/**
 * Content scrapers for YouTube transcripts, RSS articles, and Twitter (Nitter RSS).
 */

import { XMLParser } from 'fast-xml-parser';
import {
  type YouTubeSource,
  type ArticleSource,
  type TwitterSource,
  DEFAULT_NITTER_BASE,
  MAX_CONTENT_AGE_DAYS,
} from './sources';

export interface ScrapedContent {
  source: string;      // label of the source
  sourceType: 'youtube' | 'article' | 'twitter';
  text: string;        // extracted content
  date: string;        // ISO date string
  url?: string;        // original URL if available
}

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

// ---------------------------------------------------------------------------
// YouTube
// ---------------------------------------------------------------------------

/**
 * Fetch recent video transcripts from a YouTube channel.
 * Uses YouTube Data API v3 to list videos, then youtube-transcript for captions.
 */
export async function fetchYouTubeTranscripts(source: YouTubeSource): Promise<ScrapedContent[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[Scraper] YOUTUBE_API_KEY not set, skipping YouTube source:', source.label);
    return [];
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_CONTENT_AGE_DAYS);
  const publishedAfter = cutoff.toISOString();

  try {
    // List recent videos from the channel
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('channelId', source.channelId);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('order', 'date');
    searchUrl.searchParams.set('maxResults', '5');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('publishedAfter', publishedAfter);

    const res = await fetch(searchUrl.toString(), { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[Scraper] YouTube search failed:', res.status, await res.text().catch(() => ''));
      return [];
    }
    const data = await res.json();
    const items: any[] = data.items || [];

    // Dynamically import youtube-transcript (ESM package)
    const { YoutubeTranscript } = await import('youtube-transcript');

    const results: ScrapedContent[] = [];
    for (const item of items) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;

      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        const text = transcript.map((t: any) => t.text).join(' ');
        if (text.length < 50) continue; // skip very short/empty transcripts

        results.push({
          source: source.label,
          sourceType: 'youtube',
          text: text.slice(0, 15000), // cap at ~15k chars to stay within token limits
          date: item.snippet?.publishedAt || new Date().toISOString(),
          url: `https://youtube.com/watch?v=${videoId}`,
        });
      } catch (err) {
        // Transcript not available for this video (e.g. no captions)
        console.warn(`[Scraper] No transcript for video ${videoId}:`, (err as Error).message);
      }
    }

    return results;
  } catch (err) {
    console.error('[Scraper] YouTube scraper error:', (err as Error).message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Articles (RSS/Atom)
// ---------------------------------------------------------------------------

/**
 * Fetch recent articles from an RSS/Atom feed.
 */
export async function fetchArticles(source: ArticleSource): Promise<ScrapedContent[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_CONTENT_AGE_DAYS);

  try {
    const res = await fetch(source.feedUrl, {
      cache: 'no-store',
      headers: { 'User-Agent': 'FPLCompanion/1.0' },
    });
    if (!res.ok) {
      console.warn('[Scraper] Article feed failed:', source.label, res.status);
      return [];
    }

    const xml = await res.text();
    const parsed = xmlParser.parse(xml);

    // Handle both RSS 2.0 and Atom formats
    const items: any[] =
      parsed?.rss?.channel?.item ||
      parsed?.feed?.entry ||
      [];

    const itemList = Array.isArray(items) ? items : [items];
    const results: ScrapedContent[] = [];

    for (const item of itemList) {
      const pubDate = item.pubDate || item.published || item.updated || '';
      const date = pubDate ? new Date(pubDate) : new Date();
      if (date < cutoff) continue;

      // Extract text content — prefer content:encoded, then description, then summary
      let text = item['content:encoded'] || item.description || item.summary || item.content || '';
      // Strip HTML tags for clean text
      text = stripHtml(text);
      if (text.length < 30) continue;

      const link = typeof item.link === 'string'
        ? item.link
        : item.link?.['@_href'] || '';

      results.push({
        source: source.label,
        sourceType: 'article',
        text: text.slice(0, 10000),
        date: date.toISOString(),
        url: link,
      });
    }

    return results.slice(0, 10); // cap at 10 articles per source
  } catch (err) {
    console.error('[Scraper] Article scraper error:', source.label, (err as Error).message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Twitter (via Nitter RSS)
// ---------------------------------------------------------------------------

/**
 * Fetch recent tweets from a Twitter/X handle via Nitter RSS bridge.
 */
export async function fetchTweets(source: TwitterSource): Promise<ScrapedContent[]> {
  const base = source.nitterBase || DEFAULT_NITTER_BASE;
  const feedUrl = `${base}/${source.handle}/rss`;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_CONTENT_AGE_DAYS);

  try {
    const res = await fetch(feedUrl, {
      cache: 'no-store',
      headers: { 'User-Agent': 'FPLCompanion/1.0' },
    });
    if (!res.ok) {
      console.warn('[Scraper] Nitter feed failed:', source.label, res.status);
      return [];
    }

    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
    const items: any[] = parsed?.rss?.channel?.item || [];
    const itemList = Array.isArray(items) ? items : [items];
    const results: ScrapedContent[] = [];

    for (const item of itemList) {
      const pubDate = item.pubDate || '';
      const date = pubDate ? new Date(pubDate) : new Date();
      if (date < cutoff) continue;

      let text = item.title || item.description || '';
      text = stripHtml(text);
      if (text.length < 10) continue;

      results.push({
        source: source.label,
        sourceType: 'twitter',
        text: text.slice(0, 2000),
        date: date.toISOString(),
        url: item.link || '',
      });
    }

    return results.slice(0, 20); // cap at 20 tweets per handle
  } catch (err) {
    console.error('[Scraper] Twitter scraper error:', source.label, (err as Error).message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
