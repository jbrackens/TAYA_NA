"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getDiscover, type DiscoverResponse } from "../api/discover-client";

const PAGE_SIZE = 24;

export const discoverQueryKeys = {
  all: ["discover"] as const,
  feed: (q: string) => ["discover", "feed", q] as const,
};

/**
 * useDiscoverFeed — paginated infinite-query for the catalog.
 *
 * The query key includes the search term so a new search starts a fresh
 * cursor chain instead of stitching pages from different searches.
 */
export function useDiscoverFeed(q: string = "") {
  return useInfiniteQuery<DiscoverResponse>({
    queryKey: discoverQueryKeys.feed(q),
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      getDiscover({
        q,
        limit: PAGE_SIZE,
        cursor: typeof pageParam === "string" ? pageParam : undefined,
      }),
    getNextPageParam: (last) => last?.next_cursor || undefined,
    staleTime: 60 * 1000,
  });
}
