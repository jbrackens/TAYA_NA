"use client";

import { PunterSearch } from "../../components/users";
import {
  ErrorBoundary,
  ErrorState,
  SkeletonLoader,
} from "../../components/shared";
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

function UsersPageContent() {
  const [punters, setPunters] = useState<PunterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPunters = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await adminFetch(
          "/api/v1/admin/punters?page=1&pageSize=100",
        );
        if (!response.ok) {
          throw new Error("Failed to load users");
        }
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setPunters(
          items.map((item: any) => ({
            id: item.id,
            name: toDisplayName(item.email),
            email: item.email,
            lastActivity: item.lastLoginAt || "Never",
            balance: (item.walletBalanceCents ?? 0) / 100,
            pnl: (item.realizedPnlCents ?? 0) / 100,
            status: toUserStatus(item.status),
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setIsLoading(false);
      }
    };

    loadPunters();
  }, []);

  const handlePunterSelect = (punter: PunterData) => {
    console.log("Selected punter:", punter);
    // Navigate to punter detail page
    window.location.href = `/users/${punter.id}`;
  };

  const handleRetry = () => {
    setPunters([]);
    setIsLoading(true);
    setError(null);
    adminFetch("/api/v1/admin/punters?page=1&pageSize=100")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load users");
        return response.json();
      })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        setPunters(
          items.map((item: any) => ({
            id: item.id,
            name: toDisplayName(item.email),
            email: item.email,
            lastActivity: item.lastLoginAt || "Never",
            balance: (item.walletBalanceCents ?? 0) / 100,
            pnl: (item.realizedPnlCents ?? 0) / 100,
            status: toUserStatus(item.status),
          })),
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load users");
      })
      .finally(() => {
        setIsLoading(false);
      });
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
          onRetry={handleRetry}
          showRetryButton={true}
        />
      ) : isLoading ? (
        <SkeletonLoader count={3} />
      ) : (
        <PunterSearch
          punters={punters}
          onPunterSelect={handlePunterSelect}
          isLoading={false}
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
