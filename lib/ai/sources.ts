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
  /** RSS/Atom by default; use html for a maintained page with article markup. */
  format?: 'rss' | 'html';
  /** Fetch each linked article page when the feed only contains an excerpt. */
  fetchArticleBody?: boolean;
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
  {
    type: 'article',
    label: 'Fantasy Football Scout',
    feedUrl: 'https://www.fantasyfootballscout.co.uk/feed/',
    fetchArticleBody: true,
  },
  {
    type: 'article',
    label: 'All About FPL',
    feedUrl: 'https://allaboutfpl.com/feed/',
  },
  {
    type: 'article',
    label: 'Premier League suspension tracker',
    feedUrl: 'https://www.premierleague.com/en/news/4425344/which-players-are-suspended-or-close-to-a-ban-in-fantasy',
    format: 'html',
  },
  {
    type: 'article',
    label: 'Premier League injury hub',
    feedUrl: 'https://www.premierleague.com/en/latest-player-injuries',
    format: 'html',
  },
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
