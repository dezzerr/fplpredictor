/**
 * Trusted source configuration for AI-powered news & sentiment signals.
 * 
 * Add your YouTube channels, article RSS feeds, and Twitter handles here.
 * These sources are scanned before each gameweek to extract player-level
 * signals that adjust predicted points.
 */

export type SourceType = 'youtube' | 'article' | 'twitter';

export interface YouTubeSource {
  type: 'youtube';
  label: string;
  channelId: string;
}

export interface ArticleSource {
  type: 'article';
  label: string;
  feedUrl: string;
}

export interface TwitterSource {
  type: 'twitter';
  label: string;
  handle: string;
  /** Nitter instance base URL (default: nitter.net) */
  nitterBase?: string;
}

export type Source = YouTubeSource | ArticleSource | TwitterSource;

// ---------------------------------------------------------------------------
// CONFIGURE YOUR TRUSTED SOURCES BELOW
// ---------------------------------------------------------------------------

export const YOUTUBE_SOURCES: YouTubeSource[] = [
  // Example: { type: 'youtube', label: 'FPL Focal', channelId: 'UC...' },
];

export const ARTICLE_SOURCES: ArticleSource[] = [
  // Example: { type: 'article', label: 'Fantasy Football Scout', feedUrl: 'https://www.fantasyfootballscout.co.uk/feed/' },
];

export const TWITTER_SOURCES: TwitterSource[] = [
  // Example: { type: 'twitter', label: 'Ben Crellin', handle: 'BenCrelwordle' },
];

/** Default Nitter instance for Twitter RSS feeds */
export const DEFAULT_NITTER_BASE = 'https://nitter.net';

/** All sources combined */
export const ALL_SOURCES: Source[] = [
  ...YOUTUBE_SOURCES,
  ...ARTICLE_SOURCES,
  ...TWITTER_SOURCES,
];

/** Maximum age of content to consider (in days) */
export const MAX_CONTENT_AGE_DAYS = 7;
