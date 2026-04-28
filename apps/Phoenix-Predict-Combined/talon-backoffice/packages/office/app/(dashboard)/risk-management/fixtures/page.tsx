"use client";

import styled from "styled-components";
import { Card, Badge } from "../../../components/shared";
import Link from "next/link";
import { useState, useEffect } from "react";

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--t1, #1a1a1a);
`;

const TableContainer = styled(Card)`
  padding: 24px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid var(--border-1, #e5dfd2);
    font-weight: 600;
    font-size: 12px;
    color: var(--t2, #4a4a4a);
    text-transform: uppercase;
  }

  td {
    padding: 12px;
    border-bottom: 1px solid var(--border-1, #e5dfd2);
    font-size: 13px;
    color: var(--t1, #1a1a1a);
  }

  tr:hover {
    background-color: rgba(74, 126, 255, 0.05);
  }
`;

const LinkCell = styled(Link)`
  color: var(--focus-ring, #0e7a53);
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const RiskBar = styled.div`
  display: flex;
  height: 20px;
  background-color: var(--border-1, #e5dfd2);
  border-radius: 3px;
  overflow: hidden;
  max-width: 100px;
`;

interface RiskSegment {
  percentage: number;
  color: string;
}

const RiskSegmentComponent = styled.div<{ $width: number; $color: string }>`
  width: ${(props) => props.$width}%;
  background-color: ${(props) => props.$color};
  height: 100%;
`;

interface Fixture {
  id: string;
  match: string;
  sport: string;
  league: string;
  liability: number;
  exposure: number;
  risk: number;
  marketCount: number;
  status: "low" | "medium" | "high" | "critical";
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const response = await fetch(
          "/api/v1/admin/trading/fixtures?page=1&pageSize=50",
          {
            headers: {
              "X-Admin-Role": "admin",
            },
          },
        );
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setFixtures(
          items.map((item: any) => ({
            id: item.id,
            match: `${item.homeTeam} vs ${item.awayTeam}`,
            sport: item.sportKey || "Unknown",
            league: item.tournament || item.leagueKey || "Unknown",
            liability: 0,
            exposure: 0,
            risk: 0,
            marketCount: 0,
            status: "low" as const,
          })),
        );
      } catch (error) {
        console.error("Failed to fetch fixtures:", error);
        setFixtures([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFixtures();
  }, []);

  const getRiskColor = (risk: number) => {
    if (risk > 80) return "var(--no-text, #a8472d)";
    if (risk > 60) return "var(--warn, #d97706)";
    if (risk > 40) return "#60a5fa";
    return "var(--accent-lo, #1fa65e)";
  };

  const getRiskBadgeVariant = (status: string) => {
    switch (status) {
      case "critical":
      case "high":
        return "danger";
      case "medium":
        return "secondary";
      case "low":
        return "primary";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "40px", color: "var(--t2, #4a4a4a)" }}>
        Loading fixtures...
      </div>
    );
  }

  return (
    <div>
      <PageTitle>Risk-Adjusted Fixtures</PageTitle>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>Match</th>
              <th>Sport</th>
              <th>League</th>
              <th>Markets</th>
              <th>Liability</th>
              <th>Exposure</th>
              <th>Risk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.length > 0 ? (
              fixtures.map((fixture) => (
                <tr key={fixture.id}>
                  <td>
                    <LinkCell href={`/risk-management/fixtures/${fixture.id}`}>
                      {fixture.match}
                    </LinkCell>
                  </td>
                  <td>{fixture.sport}</td>
                  <td>{fixture.league}</td>
                  <td>{fixture.marketCount}</td>
                  <td>${fixture.liability.toLocaleString()}</td>
                  <td>${fixture.exposure.toLocaleString()}</td>
                  <td>
                    <RiskBar>
                      <RiskSegmentComponent
                        $width={fixture.risk}
                        $color={getRiskColor(fixture.risk)}
                      />
                    </RiskBar>
                    <div style={{ fontSize: "11px", marginTop: "4px" }}>
                      {fixture.risk.toFixed(1)}%
                    </div>
                  </td>
                  <td>
                    <Badge variant={getRiskBadgeVariant(fixture.status)}>
                      {fixture.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", color: "var(--t2, #4a4a4a)" }}
                >
                  No fixtures found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableContainer>
    </div>
  );
}
