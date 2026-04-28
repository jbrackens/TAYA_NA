"use client";

import styled from "styled-components";
import { Input, Button } from "../shared";
import { useState, useMemo } from "react";
import { DataTable, ColumnDef } from "../shared/DataTable";

const SearchContainer = styled.div`
  background-color: var(--surface-1, var(--t1, #1a1a1a));
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--t1, #1a1a1a);
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  color: var(--t2, #4a4a4a);
  text-transform: uppercase;
  font-weight: 500;
`;

const StyledInput = styled(Input)`
  background-color: var(--border-1, #e5dfd2);
  border: 1px solid var(--border-1, #e5dfd2);
  color: var(--t1, #1a1a1a);

  &:focus {
    border-color: var(--focus-ring, #0e7a53);
  }
`;

const StyledSelect = styled.select`
  background-color: var(--border-1, #e5dfd2);
  border: 1px solid var(--border-1, #e5dfd2);
  color: var(--t1, #1a1a1a);
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: var(--focus-ring, #0e7a53);
  }

  option {
    background-color: var(--surface-1, var(--t1, #1a1a1a));
    color: var(--t1, #1a1a1a);
  }
`;

const TableContainer = styled.div`
  background-color: var(--surface-1, var(--t1, #1a1a1a));
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 6px;
  padding: 20px;
`;

export interface PunterData {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended" | "inactive";
  riskSegment: "low" | "medium" | "high";
  totalBets: number;
  pnl: number;
  lastActivity: string;
}

interface PunterSearchProps {
  punters?: PunterData[];
  onPunterSelect?: (punter: PunterData) => void;
  isLoading?: boolean;
}

export function PunterSearch({
  punters = [],
  onPunterSelect,
  isLoading = false,
}: PunterSearchProps) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "suspended" | "inactive"
  >("all");
  const [segmentFilter, setSegmentFilter] = useState<
    "all" | "low" | "medium" | "high"
  >("all");

  const filteredPunters = useMemo(() => {
    return punters.filter((p) => {
      const matchesText =
        p.name.toLowerCase().includes(searchText.toLowerCase()) ||
        p.email.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesSegment =
        segmentFilter === "all" || p.riskSegment === segmentFilter;
      return matchesText && matchesStatus && matchesSegment;
    });
  }, [punters, searchText, statusFilter, segmentFilter]);

  const columns: ColumnDef<PunterData>[] = [
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
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "3px",
            fontSize: "11px",
            fontWeight: "600",
            backgroundColor:
              value === "active"
                ? "rgba(34, 197, 94, 0.2)"
                : value === "suspended"
                  ? "rgba(248, 113, 113, 0.2)"
                  : "rgba(160, 160, 160, 0.2)",
            color:
              value === "active"
                ? "var(--accent-lo, #1fa65e)"
                : value === "suspended"
                  ? "var(--no-text, #a8472d)"
                  : "var(--t2, #4a4a4a)",
          }}
        >
          {value.toUpperCase()}
        </span>
      ),
    },
    {
      key: "riskSegment",
      label: "Risk Segment",
      sortable: true,
      render: (value) => (
        <span
          style={{
            color:
              value === "high"
                ? "var(--no-text, #a8472d)"
                : value === "medium"
                  ? "var(--warn, #d97706)"
                  : "var(--accent-lo, #1fa65e)",
          }}
        >
          {value.toUpperCase()}
        </span>
      ),
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
        <span
          style={{
            color:
              value >= 0
                ? "var(--accent-lo, #1fa65e)"
                : "var(--no-text, #a8472d)",
            fontWeight: "600",
          }}
        >
          {value >= 0 ? "+" : ""}${Math.abs(value).toLocaleString()}
        </span>
      ),
    },
    {
      key: "lastActivity",
      label: "Last Activity",
      sortable: true,
    },
  ];

  return (
    <>
      <SearchContainer>
        <Title>Search Punters</Title>
        <FilterRow>
          <FilterGroup>
            <Label>Name or Email</Label>
            <StyledInput
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </FilterGroup>

          <FilterGroup>
            <Label>Status</Label>
            <StyledSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </StyledSelect>
          </FilterGroup>

          <FilterGroup>
            <Label>Risk Segment</Label>
            <StyledSelect
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </StyledSelect>
          </FilterGroup>

          <FilterGroup style={{ justifyContent: "flex-end" }}>
            <Button
              variant="primary"
              onClick={() => {
                setSearchText("");
                setStatusFilter("all");
                setSegmentFilter("all");
              }}
            >
              Reset
            </Button>
          </FilterGroup>
        </FilterRow>
      </SearchContainer>

      <TableContainer>
        <DataTable<PunterData>
          columns={columns}
          data={filteredPunters}
          pageSize={20}
          onRowClick={onPunterSelect}
          loading={isLoading}
          emptyMessage={
            punters.length === 0
              ? "No punters found"
              : "No results match your filters"
          }
        />
      </TableContainer>
    </>
  );
}
