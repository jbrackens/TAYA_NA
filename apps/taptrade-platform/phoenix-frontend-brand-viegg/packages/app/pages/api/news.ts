import type { NextApiRequest, NextApiResponse } from "next";
import { fetchAllNews, isNewsCategory, NewsItem } from "../../lib/newsFeed";

type NewsResponse = {
  items: NewsItem[];
  cached: boolean;
};

type CacheEntry = {
  at: number;
  data: NewsItem[];
};

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function getCategories(request: NextApiRequest) {
  const raw = request.query.categories;
  const value = Array.isArray(raw) ? raw.join(",") : raw;

  if (!value) {
    return undefined;
  }

  return value.split(",").filter(isNewsCategory);
}

export default async function newsHandler(
  request: NextApiRequest,
  response: NextApiResponse<NewsResponse | { error: string }>,
) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const categories = getCategories(request);
  const key = categories && categories.length > 0
    ? [...categories].sort().join(",")
    : "all";
  const hit = cache.get(key);

  if (hit && Date.now() - hit.at < TTL_MS) {
    response.status(200).json({ items: hit.data, cached: true });
    return;
  }

  const data = await fetchAllNews(categories);
  cache.set(key, { at: Date.now(), data });
  response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=60");
  response.status(200).json({ items: data, cached: false });
}
