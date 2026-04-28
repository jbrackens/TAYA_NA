"use client";

import styled from "styled-components";
import { useState, useEffect } from "react";
import { TradingBoard, MarketManagement } from "../../components/trading";
import {
  ErrorBoundary,
  LoadingSpinner,
  ErrorState,
} from "../../components/shared";
import { useRouter } from "next/navigation";

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--t1, #1a1a1a);
`;

const TradingLayout = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

interface FixtureData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  sport: string;
  status: "live" | "upcoming";
  liability: number;
  exposure: number;
}

interface MarketData {
  id: string;
  name: string;
  status: "open" | "suspended" | "settled";
  selectionCount: number;
  liability: number;
  betCount?: number;
}

function TradingPageContent() {
  const router = useRouter();
  const [fixtures, setFixtures] = useState<FixtureData[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("");
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadTradingData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(
          "/api/v1/admin/trading/fixtures?page=1&pageSize=50",
          {
            headers: {
              "X-Admin-Role": "admin",
            },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to load fixtures");
        }
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const nextFixtures: FixtureData[] = items.map((item: any) => ({
          id: item.id,
          homeTeam: item.homeTeam,
          awayTeam: item.awayTeam,
          homeScore: 0,
          awayScore: 0,
          sport: item.sportKey || "Unknown",
          status:
            new Date(item.startsAt).getTime() <= Date.now()
              ? "live"
              : "upcoming",
          marketCount: 0,
          liability: 0,
          exposure: 0,
        }));
        setFixtures(nextFixtures);
        setSelectedFixtureId((current) => current || nextFixtures[0]?.id || "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load trading data",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadTradingData();
  }, [reloadKey]);

  useEffect(() => {
    const loadMarkets = async () => {
      if (!selectedFixtureId) {
        setMarkets([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/v1/admin/trading/markets?page=1&pageSize=50&fixtureId=${encodeURIComponent(selectedFixtureId)}`,
          {
            headers: {
              "X-Admin-Role": "admin",
            },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to load markets");
        }
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setMarkets(
          items.map((item: any) => ({
            id: item.id,
            name: item.name,
            status: item.status || "open",
            selectionCount: 0,
            liability: 0,
            betCount: 0,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load markets");
      }
    };

    loadMarkets();
  }, [selectedFixtureId]);

  const handleRetry = () => {
    setFixtures([]);
    setMarkets([]);
    setSelectedFixtureId("");
    setError(null);
    setIsLoading(true);
    setReloadKey((value) => value + 1);
  };

  const selectedFixture = fixtures.find(
    (fixture) => fixture.id === selectedFixtureId,
  );

  if (isLoading) {
    return (
      <div>
        <PageTitle>Live Trading</PageTitle>
        <LoadingSpinner
          centered={true}
          text="Loading fixtures and markets..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageTitle>Live Trading</PageTitle>
        <ErrorState
          title="Failed to load trading data"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      </div>
    );
  }

  return (
    <div>
      <PageTitle>Live Trading</PageTitle>

      <TradingLayout>
        <TradingBoard
          fixtures={fixtures}
          selectedFixtureId={selectedFixtureId}
          onFixtureSelect={(fixture) => setSelectedFixtureId(fixture.id)}
        />

        {selectedFixture && (
          <MarketManagement
            markets={markets}
            onMarketToggle={async (marketId) => {
              const market = markets.find((m) => m.id === marketId);
              if (!market) return;
              const nextStatus =
                market.status === "open" ? "suspended" : "open";
              try {
                const response = await fetch(
                  `/api/v1/admin/trading/markets/${marketId}/status`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: nextStatus }),
                  },
                );
                if (!response.ok) {
                  throw new Error("Failed to update market status");
                }
                setMarkets((prev) =>
                  prev.map((m) =>
                    m.id === marketId
                      ? {
                          ...m,
                          status: nextStatus as
                            | "open"
                            | "suspended"
                            | "settled",
                        }
                      : m,
                  ),
                );
              } catch {
                setError("Failed to toggle market status");
              }
            }}
            onViewSelections={(marketId) =>
              router.push(`/risk-management/markets/${marketId}`)
            }
          />
        )}
      </TradingLayout>
    </div>
  );
}

export default function TradingPage() {
  return (
    <ErrorBoundary>
      <TradingPageContent />
    </ErrorBoundary>
  );
}
