// Duplicate / overlap detection against existing markets
// (Market Quality Pipeline, 2026-07-07).
//
// Pragmatic first version, per the pipeline plan: retrieve a small candidate
// set from the gateway's own market search (public read API — the same data
// source the player app browses), then score similarity locally with
// normalized-token Jaccard + entity overlap + close-date proximity. No vector
// subsystem; no LLM call. Detection FAILS OPEN for display (a gateway hiccup
// must not block drafting) but the failure is surfaced as a warning so admins
// know the check didn't run.

import type {
  DuplicateAction,
  DuplicateRisk,
  EventRecommendation,
  MarketCandidate,
  SimilarMarketRef,
} from "./types";

export interface ExistingMarket {
  id: string;
  ticker?: string;
  title: string;
  status?: string;
  eventId?: string;
  closeAt?: string;
  categorySlug?: string;
}

export interface DuplicateCheckResult {
  duplicateRisk?: DuplicateRisk;
  eventRecommendation?: EventRecommendation;
  warnings: string[];
}

const STOPWORDS = new Set(
  "will the a an of in on at by to be is are was were do does did for with and or vs versus who what which win wins won 2024 2025 2026 2027 2028".split(
    " ",
  ),
);

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleTokens(title: string): string[] {
  return normalizeTitle(title)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Capitalized multi-word runs — cheap named-entity approximation. */
export function extractEntities(title: string): string[] {
  const matches = title.match(/([A-Z][\w'.-]+(?: [A-Z][\w'.-]+)*)/g) ?? [];
  return matches
    .map((m) => m.trim().toLowerCase())
    .filter((m) => m.length > 3 && !STOPWORDS.has(m));
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  setA.forEach((t) => {
    if (setB.has(t)) inter++;
  });
  return inter / (setA.size + setB.size - inter);
}

function daysBetween(a?: string, b?: string): number | undefined {
  if (!a || !b) return undefined;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return undefined;
  return Math.abs(da - db) / 86_400_000;
}

export interface ScoredSimilarity {
  market: ExistingMarket;
  similarity: number;
  reason: string;
}

/** Pure similarity scoring — exported for tests and evals. */
export function scoreSimilarity(
  candidate: MarketCandidate,
  existing: ExistingMarket,
): ScoredSimilarity {
  const candTokens = titleTokens(candidate.marketTitle);
  const exTokens = titleTokens(existing.title);
  const tokenSim = jaccard(candTokens, exTokens);
  const entitySim = jaccard(
    extractEntities(candidate.marketTitle),
    extractEntities(existing.title),
  );
  const dateGap = daysBetween(candidate.proposedCloseTime, existing.closeAt);
  const dateBoost =
    dateGap === undefined ? 0 : dateGap <= 2 ? 0.15 : dateGap <= 14 ? 0.05 : 0;
  const exactNorm =
    normalizeTitle(candidate.marketTitle) === normalizeTitle(existing.title);

  const similarity = exactNorm
    ? 1
    : Math.min(1, 0.6 * tokenSim + 0.25 * entitySim + dateBoost);

  const reasonParts: string[] = [];
  if (exactNorm) reasonParts.push("identical title after normalization");
  else {
    if (tokenSim >= 0.4) reasonParts.push(`${Math.round(tokenSim * 100)}% shared wording`);
    if (entitySim >= 0.4) reasonParts.push("same named entities");
    if (dateGap !== undefined && dateGap <= 2)
      reasonParts.push("same close window");
  }
  return {
    market: existing,
    similarity,
    reason: reasonParts.join("; ") || "weak lexical overlap",
  };
}

export function classifyDuplicates(
  scored: ScoredSimilarity[],
): DuplicateCheckResult {
  const relevant = scored
    .filter((s) => s.similarity >= 0.35)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  if (relevant.length === 0) {
    return {
      duplicateRisk: {
        risk: "low",
        similarMarkets: [],
        recommendedAction: "create_new_market",
      },
      warnings: [],
    };
  }

  const refs: SimilarMarketRef[] = relevant.map((s) => ({
    id: s.market.id,
    ticker: s.market.ticker,
    title: s.market.title,
    status: s.market.status,
    eventId: s.market.eventId,
    similarity: Number(s.similarity.toFixed(2)),
    similarityReason: s.reason,
  }));

  const top = relevant[0];
  let risk: DuplicateRisk["risk"];
  let action: DuplicateAction;
  if (top.similarity >= 0.85) {
    risk = "high";
    action = "reject_duplicate";
  } else if (top.similarity >= 0.6) {
    risk = "high";
    action = "needs_admin_review";
  } else if (top.similarity >= 0.45) {
    risk = "medium";
    action = top.market.eventId
      ? "attach_to_existing_event"
      : "rewrite_to_different_angle";
  } else {
    risk = "low";
    action = "create_new_market";
  }

  // Event recommendation: when the closest overlaps live under one event,
  // the candidate probably belongs there too (a market desk groups angles
  // of the same story, it doesn't scatter them).
  let eventRecommendation: EventRecommendation | undefined;
  const eventCounts = new Map<string, number>();
  for (const s of relevant) {
    if (s.market.eventId)
      eventCounts.set(
        s.market.eventId,
        (eventCounts.get(s.market.eventId) ?? 0) + 1,
      );
  }
  const [topEventId, count] =
    Array.from(eventCounts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (topEventId && count >= 2 && action !== "reject_duplicate") {
    eventRecommendation = {
      action: "attach_existing",
      existingEventId: topEventId,
      reason: `${count} similar markets already live under this event`,
    };
  }

  return {
    duplicateRisk: { risk, similarMarkets: refs, recommendedAction: action },
    eventRecommendation,
    warnings: [],
  };
}

/**
 * Retrieve a small comparison set from the gateway's market search and score
 * the candidate against it. gatewayBase is the server-side base URL (the
 * office route already knows it); fetchImpl is injectable for tests.
 */
export async function checkDuplicates(
  candidate: MarketCandidate,
  gatewayBase: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DuplicateCheckResult> {
  const tokens = titleTokens(candidate.marketTitle);
  const entities = extractEntities(candidate.marketTitle);
  // Entities are the highest-signal query; fall back to the two rarest-ish
  // (longest) tokens.
  const query =
    entities[0] ??
    tokens
      .sort((a, b) => b.length - a.length)
      .slice(0, 2)
      .join(" ");
  if (!query) {
    return { warnings: ["duplicate check skipped: no searchable tokens"] };
  }

  let existing: ExistingMarket[] = [];
  try {
    const res = await fetchImpl(
      `${gatewayBase}/api/v1/markets?search=${encodeURIComponent(query)}&limit=20`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`gateway search returned ${res.status}`);
    const data = (await res.json()) as { data?: ExistingMarket[] };
    existing = data.data ?? [];
  } catch (err) {
    return {
      warnings: [
        `duplicate check unavailable (${err instanceof Error ? err.message : "error"}) — review manually`,
      ],
    };
  }

  const scored = existing.map((m) => scoreSimilarity(candidate, m));
  return classifyDuplicates(scored);
}
