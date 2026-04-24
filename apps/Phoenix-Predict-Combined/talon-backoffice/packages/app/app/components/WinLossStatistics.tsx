"use client";

import React, { useState, useEffect } from "react";
import { getUserBets, UserBet } from "../lib/api/betting-client";

interface WinLossStatisticsProps {
  userId: string;
}

type TimePeriod = "7d" | "30d" | "90d" | "all";

export default function WinLossStatistics({ userId }: WinLossStatisticsProps) {
  const [bets, setBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");

  useEffect(() => {
    const fetchBets = async () => {
      setLoading(true);
      setError(null);
      try {
        const allBets = await getUserBets(userId);
        setBets(allBets);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load bets";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();
  }, [userId]);

  const getFilteredBets = (): UserBet[] => {
    const now = new Date();
    return bets.filter((bet) => {
      const betDate = new Date(bet.createdAt);
      const daysDiff =
        (now.getTime() - betDate.getTime()) / (1000 * 60 * 60 * 24);

      switch (timePeriod) {
        case "7d":
          return daysDiff <= 7;
        case "30d":
          return daysDiff <= 30;
        case "90d":
          return daysDiff <= 90;
        case "all":
          return true;
        default:
          return true;
      }
    });
  };

  const calculateStats = () => {
    const filteredBets = getFilteredBets();
    const totalBets = filteredBets.length;
    const wins = filteredBets.filter((b) => b.status === "won").length;
    const losses = filteredBets.filter((b) => b.status === "lost").length;
    const pending = filteredBets.filter((b) => b.status === "pending").length;

    const totalStaked = filteredBets.reduce((sum, b) => sum + b.stake, 0);
    const totalReturned = filteredBets.reduce((sum, b) => {
      if (b.status === "won") {
        return sum + b.potentialReturn;
      }
      return sum;
    }, 0);

    const netProfitLoss = totalReturned - totalStaked;
    const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : "0";

    return {
      totalBets,
      wins,
      losses,
      pending,
      totalStaked,
      totalReturned,
      netProfitLoss,
      winRate,
    };
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value / 100);
  };

  const stats = calculateStats();

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: "600",
    color: "#e2e8f0",
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
  };

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    backgroundColor: isActive ? "var(--accent)" : "transparent",
    border: `1px solid ${isActive ? "var(--accent)" : "#1a1f3a"}`,
    color: isActive ? "#0f1225" : "#cbd5e1",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    transition: "all 0.2s",
  });

  const statsGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
  };

  const cardStyle: React.CSSProperties = {
    padding: "12px",
    backgroundColor: "#0a0e18",
    border: "1px solid #1a1f3a",
    borderRadius: "4px",
  };

  const cardLabelStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: "6px",
  };

  const cardValueStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: "700",
    color: "#e2e8f0",
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ color: "#64748b", fontSize: "13px" }}>
          Loading statistics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ color: "var(--no)", fontSize: "13px" }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Win/Loss Statistics</h3>
        <div style={buttonGroupStyle}>
          {(["7d", "30d", "90d", "all"] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              style={buttonStyle(timePeriod === period)}
              onMouseEnter={(e) => {
                if (timePeriod !== period) {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }
              }}
              onMouseLeave={(e) => {
                if (timePeriod !== period) {
                  e.currentTarget.style.borderColor = "#1a1f3a";
                  e.currentTarget.style.color = "#cbd5e1";
                }
              }}
            >
              {period === "all" ? "All Time" : period}
            </button>
          ))}
        </div>
      </div>

      <div style={statsGridStyle}>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Total Bets</div>
          <div style={cardValueStyle}>{stats.totalBets}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>Wins</div>
          <div style={{ ...cardValueStyle, color: "#86efac" }}>
            {stats.wins}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>Losses</div>
          <div style={{ ...cardValueStyle, color: "var(--no)" }}>
            {stats.losses}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>Pending</div>
          <div style={{ ...cardValueStyle, color: "#fbbf24" }}>
            {stats.pending}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>Win Rate</div>
          <div style={cardValueStyle}>{stats.winRate}%</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>Total Staked</div>
          <div style={cardValueStyle}>{formatCurrency(stats.totalStaked)}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>Total Returned</div>
          <div style={cardValueStyle}>
            {formatCurrency(stats.totalReturned)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>Net P/L</div>
          <div
            style={{
              ...cardValueStyle,
              color: stats.netProfitLoss >= 0 ? "#86efac" : "var(--no)",
            }}
          >
            {stats.netProfitLoss >= 0 ? "+" : ""}
            {formatCurrency(stats.netProfitLoss)}
          </div>
        </div>
      </div>
    </div>
  );
}
