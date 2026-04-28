"use client";

import styled from "styled-components";
import { PunterSearch } from "../../components/users";
import {
  ErrorBoundary,
  LoadingSpinner,
  ErrorState,
  SkeletonLoader,
} from "../../components/shared";
import { useState, useEffect } from "react";

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--t1, #1a1a1a);
`;

interface PunterData {
  id: string;
  name: string;
  email: string;
  lastActivity: string;
  totalBets: number;
  pnl: number;
  status: "active" | "suspended" | "inactive";
  riskSegment: "low" | "medium" | "high";
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

const toRiskSegment = (status: string): PunterData["riskSegment"] => {
  if (status === "suspended") return "high";
  if (status === "active") return "low";
  return "medium";
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
        const response = await fetch(
          "/api/v1/admin/punters?page=1&pageSize=100",
          {
            headers: {
              "X-Admin-Role": "admin",
            },
          },
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
            totalBets: 0,
            pnl: 0,
            status: toUserStatus(item.status),
            riskSegment: toRiskSegment(item.status),
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
    fetch("/api/v1/admin/punters?page=1&pageSize=100", {
      headers: {
        "X-Admin-Role": "admin",
      },
    })
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
            totalBets: 0,
            pnl: 0,
            status: toUserStatus(item.status),
            riskSegment: toRiskSegment(item.status),
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
      <PageTitle>Users</PageTitle>

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
