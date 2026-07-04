"use client";

import { PunterSearch } from "../../components/users";
import { ErrorBoundary, ErrorState } from "../../components/shared";
import { useState, useEffect } from "react";
import { adminFetch } from "../../lib/admin-fetch";

interface PunterData {
  id: string;
  name: string;
  email: string;
  lastActivity: string;
  balance: number;
  pnl: number;
  status: "active" | "suspended" | "inactive";
}

const toDisplayName = (email: string) =>
  email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || email;

const toUserStatus = (status: string): PunterData["status"] => {
  if (status === "suspended") return "suspended";
  if (status === "active") return "active";
  return "inactive";
};

// GAP-81 (§10 Player Search / §32 Scenario 2): the search runs SERVER-SIDE so
// any punter — not just the newest page — is findable. The office previously
// fetched a fixed pageSize=100 window and filtered it in memory, so "search by
// email" silently missed every punter outside that window on a real book.
const PUNTERS_PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 300;

function buildPuntersURL(search: string): string {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(PUNTERS_PAGE_SIZE),
  });
  const trimmed = search.trim();
  if (trimmed) {
    params.set("search", trimmed);
  }
  return `/api/v1/admin/punters?${params.toString()}`;
}

function UsersPageContent() {
  const [punters, setPunters] = useState<PunterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // reloadNonce lets the Retry button force a refetch even when the search term
  // is unchanged (a no-op setSearchTerm would be dropped by React's bail-out).
  const [reloadNonce, setReloadNonce] = useState(0);

  // Server-side, debounced search. Re-runs whenever the search term changes; the
  // backend applies the email/username ILIKE filter over the full population.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await adminFetch(buildPuntersURL(searchTerm));
        if (!response.ok) {
          throw new Error("Failed to load users");
        }
        const data = await response.json();
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setPunters(
          items.map((item: any) => ({
            id: item.id,
            name: toDisplayName(item.email),
            email: item.email,
            lastActivity: item.lastLoginAt || "Never",
            balance: (item.pointAccountBalanceCents ?? 0) / 100,
            pnl: (item.realizedPointsCents ?? 0) / 100,
            status: toUserStatus(item.status),
          })),
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const handle = setTimeout(load, searchTerm ? SEARCH_DEBOUNCE_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchTerm, reloadNonce]);

  const handlePunterSelect = (punter: PunterData) => {
    // Navigate to punter detail page
    window.location.href = `/users/${punter.id}`;
  };

  return (
    <div>
      <h1 className="mb-6 text-[28px] font-bold text-[var(--t1,#1a1a1a)]">
        Users
      </h1>

      {error ? (
        <ErrorState
          title="Failed to load users"
          message={error}
          onRetry={() => setReloadNonce((n) => n + 1)}
          showRetryButton={true}
        />
      ) : (
        <PunterSearch
          punters={punters}
          searchText={searchTerm}
          onSearchChange={setSearchTerm}
          onPunterSelect={handlePunterSelect}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <ErrorBoundary>
      <UsersPageContent />
    </ErrorBoundary>
  );
}
