import Parser from "rss-parser";

export type Category = "sports" | "politics" | "finance" | "crypto" | "general";

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  category: Category;
  publishedAt: string;
  summary?: string;
  image?: string;
}

const RSS_FEEDS: { url: string; source: string; category: Category }[] = [
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World", category: "politics" },
  { url: "https://feeds.npr.org/1014/rss.xml", source: "NPR Politics", category: "politics" },
  { url: "https://www.politico.com/rss/politicopicks.xml", source: "POLITICO", category: "politics" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC Markets", category: "finance" },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/", source: "MarketWatch", category: "finance" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk", category: "crypto" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph", category: "crypto" },
  { url: "https://www.theblock.co/rss.xml", source: "The Block", category: "crypto" },
  { url: "https://www.espn.com/espn/rss/news", source: "ESPN", category: "sports" },
  { url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport", category: "sports" },
];

const allowedCategories = new Set<Category>([
  "sports",
  "politics",
  "finance",
  "crypto",
  "general",
]);

const parser = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "prediction-market-news/1.0" },
});

export function isNewsCategory(value: string): value is Category {
  return allowedCategories.has(value as Category);
}

function hash(value: string): string {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (Math.imul(31, result) + value.charCodeAt(i)) | 0;
  }
  return (result >>> 0).toString(36);
}

function extractImage(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

async function fetchOneFeed(feed: typeof RSS_FEEDS[number]): Promise<NewsItem[]> {
  try {
    const result = await parser.parseURL(feed.url);

    return (result.items || []).slice(0, 20).map((item) => {
      const url = item.link || "";

      return {
        id: hash(url || `${feed.source}-${item.title || ""}`),
        title: (item.title || "").trim(),
        url,
        source: feed.source,
        category: feed.category,
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        summary: item.contentSnippet ? item.contentSnippet.slice(0, 240) : undefined,
        image:
          (item.enclosure as { url?: string } | undefined)?.url ||
          extractImage(item.content || ""),
      };
    });
  } catch (error) {
    // Keep the feed resilient if one publisher blocks or times out.
    console.warn(`[newsFeed] ${feed.source} failed:`, (error as Error).message);
    return [];
  }
}

export async function fetchAllNews(categories?: Category[]): Promise<NewsItem[]> {
  const feeds = categories && categories.length > 0
    ? RSS_FEEDS.filter((feed) => categories.includes(feed.category))
    : RSS_FEEDS;

  const batches = await Promise.all(feeds.map(fetchOneFeed));
  const items = batches.reduce<NewsItem[]>(
    (allItems, batch) => allItems.concat(batch),
    [],
  );
  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    if (!item.url || seen.has(item.url)) {
      return false;
    }
    seen.add(item.url);
    return true;
  });

  deduped.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return deduped.slice(0, 100);
}
