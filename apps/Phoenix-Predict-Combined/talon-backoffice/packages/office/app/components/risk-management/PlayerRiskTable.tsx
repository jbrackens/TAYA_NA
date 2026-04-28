"use client";

import styled from "styled-components";
import { Badge } from "../shared";
import { DataTable, ColumnDef } from "../shared/DataTable";

const TableWrapper = styled.div`
  background-color: var(--surface-1, var(--t1, #1a1a1a));
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 6px;
  padding: 20px;
`;

const Title = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--t1, #1a1a1a);
`;

const RiskScoreBadge = styled.span<{ $score: number }>`
  padding: 4px 8px;
  border-radius: 3px;
  font-weight: 600;
  background-color: ${(props) => {
    if (props.$score >= 80) return "rgba(248, 113, 113, 0.2)";
    if (props.$score >= 60) return "rgba(251, 146, 60, 0.2)";
    if (props.$score >= 40) return "rgba(251, 191, 36, 0.2)";
    return "rgba(34, 197, 94, 0.2)";
  }};
  color: ${(props) => {
    if (props.$score >= 80) return "var(--no-text, #a8472d)";
    if (props.$score >= 60) return "#fb923c";
    if (props.$score >= 40) return "var(--warn, #d97706)";
    return "var(--accent-lo, #1fa65e)";
  }};
`;

const PnLValue = styled.span<{ $positive?: boolean }>`
  color: ${(props) =>
    props.$positive ? "var(--accent-lo, #1fa65e)" : "var(--no-text, #a8472d)"};
  font-weight: 600;
`;

export interface PlayerRiskData {
  id: string;
  name: string;
  email: string;
  riskScore: number;
  segment: "low" | "medium" | "high" | "vip";
  totalBets: number;
  pnl: number;
  lastActivity: string;
}

interface PlayerRiskTableProps {
  players?: PlayerRiskData[];
  onPlayerClick?: (player: PlayerRiskData) => void;
  isLoading?: boolean;
}

export function PlayerRiskTable({
  players = [],
  onPlayerClick,
  isLoading = false,
}: PlayerRiskTableProps) {
  const columns: ColumnDef<PlayerRiskData>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
    },
    {
      key: "riskScore",
      label: "Risk Score",
      sortable: true,
      render: (value) => (
        <RiskScoreBadge $score={value}>{value.toFixed(1)}</RiskScoreBadge>
      ),
    },
    {
      key: "segment",
      label: "Segment",
      sortable: true,
      render: (value) => {
        const variantMap = {
          low: "primary",
          medium: "secondary",
          high: "danger",
          vip: "success",
        } as const;
        return (
          <Badge variant={variantMap[value as keyof typeof variantMap]}>
            {value.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: "totalBets",
      label: "Total Bets",
      sortable: true,
      render: (value) => value.toLocaleString(),
    },
    {
      key: "pnl",
      label: "P&L",
      sortable: true,
      render: (value) => (
        <PnLValue $positive={value >= 0}>
          {value >= 0 ? "+" : ""}${Math.abs(value).toLocaleString()}
        </PnLValue>
      ),
    },
    {
      key: "lastActivity",
      label: "Last Activity",
      sortable: true,
    },
  ];

  return (
    <TableWrapper>
      <Title>Player Risk Management</Title>
      <DataTable<PlayerRiskData>
        columns={columns}
        data={players}
        pageSize={20}
        onRowClick={onPlayerClick}
        loading={isLoading}
        emptyMessage="No players to display"
      />
    </TableWrapper>
  );
}
