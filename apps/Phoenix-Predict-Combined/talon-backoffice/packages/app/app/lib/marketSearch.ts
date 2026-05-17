/**
 * Relevance ranking for the top-bar market search (LC-26).
 *
 * The search box previously returned `allMarkets.filter(includes).slice(0,8)`
 * in raw API order, so typing a market's ticker could rank it below
 * incidental title-substring hits or fall outside the 8-result cap. This
 * ranks matches so an exact / prefix ticker match surfaces first while
 * keeping recall identical (same combined "ticker title" substring match)
 * and the API order as a stable within-tier tiebreak.
 *
 * Pure and dependency-free so it is unit-tested directly (no React render).
 */

export interface SearchableMarket {
  ticker: string;
  title: string;
}

export function searchMarkets<T extends SearchableMarket>(
  markets: T[],
  query: string,
  limit = 8,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const rank = (m: SearchableMarket): number => {
    const t = m.ticker.toLowerCase();
    const title = m.title.toLowerCase();
    if (t === q) return 0; // exact ticker
    if (t.startsWith(q)) return 1; // ticker prefix
    if (t.includes(q)) return 2; // ticker substring
    if (title.startsWith(q)) return 3; // title prefix
    if (title.includes(q)) return 4; // title substring
    return 5; // matched only across the "ticker title" boundary
  };

  return markets
    .filter((m) => `${m.ticker} ${m.title}`.toLowerCase().includes(q))
    .map((m, i) => ({ m, i, r: rank(m) }))
    .sort((a, b) => (a.r !== b.r ? a.r - b.r : a.i - b.i))
    .slice(0, limit)
    .map((x) => x.m);
}
