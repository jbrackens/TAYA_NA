import { apiClient } from "./client";

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

export interface ContentBlock {
  blockId: number;
  pageId: number;
  blockType: string;
  content: Record<string, unknown>;
  sortOrder: number;
}

export interface ContentPage {
  pageId: number;
  slug: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  status: string;
  publishedAt: string | null;
  blocks: ContentBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  bannerId: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  sortOrder: number;
  active: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
}

interface BannersResponse {
  banners: Banner[];
}

const PAGE_CACHE_TTL_MS = 60_000;
const BANNER_CACHE_TTL_MS = 30_000;

const pageCache = new Map<
  string,
  {
    entry: TimedCacheEntry<ContentPage> | null;
    promise: Promise<ContentPage> | null;
  }
>();

const bannerCache = new Map<
  string,
  { entry: TimedCacheEntry<Banner[]> | null; promise: Promise<Banner[]> | null }
>();

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return entry !== null && Date.now() - entry.ts < ttlMs;
}

export async function getPage(slug: string): Promise<ContentPage> {
  const cached = pageCache.get(slug);
  if (cached && isFresh(cached.entry, PAGE_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) return cached.promise;

  const promise = apiClient
    .get<ContentPage>(`/api/v1/content/${slug}`)
    .then((data) => {
      pageCache.set(slug, { entry: { data, ts: Date.now() }, promise: null });
      return data;
    })
    .catch((err: unknown) => {
      pageCache.set(slug, { entry: null, promise: null });
      throw err;
    });

  pageCache.set(slug, { entry: cached?.entry ?? null, promise });
  return promise;
}

export async function getBanners(position: string = "hero"): Promise<Banner[]> {
  const cached = bannerCache.get(position);
  if (cached && isFresh(cached.entry, BANNER_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) return cached.promise;

  const promise = apiClient
    .get<BannersResponse>("/api/v1/banners", { position })
    .then((res) => {
      const data = res.banners || [];
      bannerCache.set(position, {
        entry: { data, ts: Date.now() },
        promise: null,
      });
      return data;
    })
    .catch((err: unknown) => {
      bannerCache.set(position, { entry: null, promise: null });
      throw err;
    });

  bannerCache.set(position, { entry: cached?.entry ?? null, promise });
  return promise;
}

/** Invalidate content caches (call after CMS publish events). */
export function invalidateContentCaches(): void {
  pageCache.clear();
  bannerCache.clear();
}
