import { XMLParser } from 'fast-xml-parser';
import { CircuitBreaker } from './circuit-breaker';

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

interface FeedItemWithSource extends FeedItem {
  source: string;
}

interface FeedConfig {
  name: string;
  url: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

const feedBreakers = new Map<string, CircuitBreaker<FeedItem[]>>();

function getBreakerForFeed(url: string): CircuitBreaker<FeedItem[]> {
  let breaker = feedBreakers.get(url);
  if (!breaker) {
    breaker = new CircuitBreaker<FeedItem[]>({
      maxFailures: 3,
      cooldownMs: 120_000,
      name: `rss-${new URL(url).hostname}`,
    });
    feedBreakers.set(url, breaker);
  }
  return breaker;
}

function normalizeItems(parsed: Record<string, any>): FeedItem[] {
  // Handle RSS 2.0 format
  const rssChannel = parsed?.rss?.channel;
  if (rssChannel) {
    const items = Array.isArray(rssChannel.item)
      ? rssChannel.item
      : rssChannel.item
        ? [rssChannel.item]
        : [];

    return items.map((item: Record<string, unknown>) => {
      let title = String(item.title || '');
      // Google News titles end with " - Source Name" — strip it
      title = title.replace(/\s-\s[A-Z][A-Za-z\s.]+$/, '');
      return {
        title,
        link: String(item.link || ''),
        pubDate: String(item.pubDate || ''),
        description: String(item.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
      };
    });
  }

  // Handle Atom format
  const atomFeed = parsed?.feed;
  if (atomFeed) {
    const entries = Array.isArray(atomFeed.entry)
      ? atomFeed.entry
      : atomFeed.entry
        ? [atomFeed.entry]
        : [];

    return entries.map((entry: Record<string, unknown>) => {
      let link = '';
      if (typeof entry.link === 'string') {
        link = entry.link;
      } else if (entry.link && typeof entry.link === 'object') {
        const linkObj = entry.link as Record<string, string>;
        link = linkObj['@_href'] || linkObj.href || '';
      } else if (Array.isArray(entry.link)) {
        const altLink = (entry.link as Record<string, string>[]).find(
          (l) => l['@_rel'] === 'alternate' || !l['@_rel']
        );
        link = altLink?.['@_href'] || '';
      }

      const content = entry.content || entry.summary || '';
      const description = typeof content === 'string'
        ? content.replace(/<[^>]*>/g, '').slice(0, 500)
        : typeof content === 'object' && content !== null
          ? String((content as Record<string, unknown>)['#text'] || '').replace(/<[^>]*>/g, '').slice(0, 500)
          : '';

      return {
        title: String(entry.title || ''),
        link,
        pubDate: String(entry.published || entry.updated || ''),
        description,
      };
    });
  }

  return [];
}

export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const breaker = getBreakerForFeed(url);

  return breaker.execute(async () => {
    try {
      // Route through Vite dev proxy to avoid CORS
      const proxyUrl = `/rss-proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`RSS fetch failed for ${url}: ${response.status}`);
      }

      const xml = await response.text();
      const parsed = parser.parse(xml);
      return normalizeItems(parsed);
    } catch (error) {
      console.warn(`[RSS] Failed to fetch feed ${url}:`, error);
      throw error;
    }
  });
}

export async function fetchAllFeeds(
  feeds: FeedConfig[]
): Promise<FeedItemWithSource[]> {
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      try {
        const items = await fetchFeed(feed.url);
        return items.map((item) => ({ ...item, source: feed.name }));
      } catch (error) {
        console.warn(`[RSS] Feed "${feed.name}" failed:`, error);
        return [];
      }
    })
  );

  const allItems: FeedItemWithSource[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  // Sort by pubDate descending
  allItems.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime() || 0;
    const dateB = new Date(b.pubDate).getTime() || 0;
    return dateB - dateA;
  });

  // Deduplicate by title
  const seen = new Set<string>();
  const deduped: FeedItemWithSource[] = [];
  for (const item of allItems) {
    const key = item.title.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return deduped;
}
