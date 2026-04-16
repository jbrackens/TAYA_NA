"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import { getActiveBonuses, type PlayerBonus } from "../lib/api/bonus-client";
import { WageringProgress } from "../components/WageringProgress";
import { useAuth } from "../hooks/useAuth";
import Collapse from "../components/Collapse";

interface Promotion {
  id: string;
  title: string;
  description: string;
  validFrom: string;
  validTo: string;
  details?: string;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<Promotion[]>("/api/v1/promotions");
        setPromotions(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load promotions",
        );
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  const containerStyle: React.CSSProperties = {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "32px 20px",
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: "32px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "28px",
    fontWeight: "800",
    color: "#e2e8f0",
    marginBottom: "8px",
    letterSpacing: "-0.02em",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "#64748b",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
    marginBottom: "32px",
  };

  const cardStyle: React.CSSProperties = {
    padding: "20px",
    backgroundColor: "#0f1225",
    border: "1px solid #1a1f3a",
    borderRadius: "8px",
    transition: "all 0.3s",
  };

  const cardHoverStyle: React.CSSProperties = {
    ...cardStyle,
    borderColor: "#39ff14",
    boxShadow: "0 4px 12px rgba(57, 255, 20, 0.15)",
  };

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const dateRangeStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #1a1f3a",
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "60px 20px",
    color: "#64748b",
  };

  const emptyTitleStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: "8px",
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Current Promotions</h1>
          <p style={subtitleStyle}>Loading promotions...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style dangerouslySetInnerHTML={{ __html: transitionStyles }} />
      <div style={headerStyle}>
        <h1 style={titleStyle}>Current Promotions</h1>
        <p style={subtitleStyle}>
          Discover our latest offers and exclusive deals
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "6px",
            color: "#fca5a5",
            marginBottom: "24px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* Active Bonuses Section */}
      <ActiveBonusesSection />

      {promotions.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyTitleStyle}>No Promotions Available</div>
          <p>Check back soon for our latest offers.</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {promotions.map((promo) => (
            <div
              key={promo.id}
              style={hoveredCard === promo.id ? cardHoverStyle : cardStyle}
              onMouseEnter={() => setHoveredCard(promo.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="promo-card"
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#e2e8f0",
                  marginBottom: "8px",
                }}
              >
                {promo.title}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#cbd5e1",
                  lineHeight: "1.6",
                  marginBottom: "12px",
                }}
              >
                {promo.description}
              </p>
              <div style={dateRangeStyle}>
                <div style={{ marginBottom: "4px" }}>
                  From: {new Date(promo.validFrom).toLocaleDateString()}
                </div>
                <div>To: {new Date(promo.validTo).toLocaleDateString()}</div>
              </div>
              {promo.details && (
                <div style={{ marginTop: "16px" }}>
                  <Collapse title="View Details" defaultOpen={false}>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#D3D3D3",
                        lineHeight: "1.6",
                      }}
                    >
                      {promo.details}
                    </p>
                  </Collapse>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveBonusesSection() {
  const { isAuthenticated } = useAuth();
  const [bonuses, setBonuses] = useState<PlayerBonus[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    getActiveBonuses()
      .then((data) => {
        if (!cancelled) setBonuses(data);
      })
      .catch(() => {
        /* ignore — section just won't show */
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated || bonuses.length === 0) return null;

  return (
    <div style={{ marginBottom: "32px" }}>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: "700",
          color: "#e2e8f0",
          marginBottom: "16px",
        }}
      >
        Your Active Bonuses
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {bonuses.map((bonus) => (
          <div
            key={bonus.bonusId}
            style={{
              padding: "16px",
              backgroundColor: "#0f1225",
              border: "1px solid #1a1f3a",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#e2e8f0",
                  }}
                >
                  {bonus.campaignName || bonus.bonusType}
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    backgroundColor: "rgba(57, 255, 20, 0.1)",
                    color: "#39ff14",
                  }}
                >
                  {bonus.status}
                </span>
              </div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#39ff14",
                }}
              >
                ${(bonus.grantedAmountCents / 100).toFixed(2)}
              </span>
            </div>
            <WageringProgress
              requiredCents={bonus.wageringRequiredCents}
              completedCents={bonus.wageringCompletedCents}
              progressPct={bonus.wageringProgressPct}
              expiresAt={bonus.expiresAt}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const transitionStyles = `
  .promo-card {
    cursor: pointer;
  }
`;
