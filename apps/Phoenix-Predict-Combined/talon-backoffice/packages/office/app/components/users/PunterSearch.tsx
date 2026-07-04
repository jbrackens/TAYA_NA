"use client";

import { Input, Button } from "../shared";
import { useState, useMemo } from "react";
import { DataTable, ColumnDef } from "../shared/DataTable";

export interface PunterData {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended" | "inactive";
  balance: number;
  pnl: number;
  lastActivity: string;
}

type PunterStatusFilter = "all" | PunterData["status"];

const isPunterStatusFilter = (value: string): value is PunterStatusFilter =>
  value === "all" ||
  value === "active" ||
  value === "suspended" ||
  value === "inactive";

interface PunterSearchProps {
  punters?: PunterData[];
  onPunterSelect?: (punter: PunterData) => void;
  isLoading?: boolean;
  // GAP-81: search is CONTROLLED and applied server-side by the parent (so any
  // punter is findable, not just the fetched page). The status filter stays a
  // client-side refinement of the returned rows.
  searchText?: string;
  onSearchChange?: (value: string) => void;
}

const panelClassName =
  "min-w-0 rounded-md border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-5";
const titleClassName =
  "m-0 mb-4 text-base font-semibold text-[var(--t1,#1a1a1a)]";
const filterGroupClassName = "flex flex-col gap-1.5";
const labelClassName = "text-xs font-medium uppercase text-[var(--t2,#4a4a4a)]";
const inputClassName =
  "!border-[var(--border-1,#e5dfd2)] !bg-[var(--border-1,#e5dfd2)] !text-[var(--t1,#1a1a1a)] focus:!border-[var(--focus-ring,#0e7a53)]";
const selectClassName =
  "cursor-pointer rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--border-1,#e5dfd2)] p-2 text-[13px] text-[var(--t1,#1a1a1a)] focus:border-[var(--focus-ring,#0e7a53)] focus:outline-none";
const optionClassName =
  "bg-[var(--surface-1,#ffffff)] text-[var(--t1,#1a1a1a)]";

export function PunterSearch({
  punters = [],
  onPunterSelect,
  isLoading = false,
  searchText = "",
  onSearchChange,
}: PunterSearchProps) {
  const [statusFilter, setStatusFilter] = useState<PunterStatusFilter>("all");

  // Search is applied server-side by the parent; here we only refine the
  // returned rows by status (a client-side narrowing of the search results).
  const filteredPunters = useMemo(() => {
    if (statusFilter === "all") return punters;
    return punters.filter((p) => p.status === statusFilter);
  }, [punters, statusFilter]);

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
      render: (value) => {
        const statusClassName =
          value === "active"
            ? "bg-[rgba(34,197,94,0.2)] text-[var(--accent-lo,#1fa65e)]"
            : value === "suspended"
              ? "bg-[rgba(248,113,113,0.2)] text-[var(--no-text,#a8472d)]"
              : "bg-[rgba(160,160,160,0.2)] text-[var(--t2,#4a4a4a)]";

        return (
          <span
            className={`rounded-[3px] px-2 py-0.5 text-[11px] font-semibold ${statusClassName}`}
          >
            {value.toUpperCase()}
          </span>
        );
      },
    },
    {
      key: "balance",
      label: "Point balance",
      sortable: true,
      render: (value) =>
        `${value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} pts`,
    },
    {
      key: "pnl",
      label: "Point result",
      sortable: true,
      render: (value) => (
        <span
          className={`font-semibold ${
            value >= 0
              ? "text-[var(--accent-lo,#1fa65e)]"
              : "text-[var(--no-text,#a8472d)]"
          }`}
        >
          {value < 0 ? "-" : "+"}
          {Math.abs(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          {" pts"}
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
      <div className={`${panelClassName} mb-5`}>
        <h3 className={titleClassName}>Search Punters</h3>
        <div className="mb-4 grid grid-cols-[2fr_1fr_auto] gap-3 max-[1024px]:grid-cols-1">
          <div className={filterGroupClassName}>
            <label className={labelClassName}>Name or Email</label>
            <Input
              className={inputClassName}
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>

          <div className={filterGroupClassName}>
            <label className={labelClassName}>Status</label>
            <select
              className={selectClassName}
              value={statusFilter}
              onChange={(e) => {
                const nextStatusFilter = e.target.value;
                if (isPunterStatusFilter(nextStatusFilter)) {
                  setStatusFilter(nextStatusFilter);
                }
              }}
            >
              <option className={optionClassName} value="all">
                All
              </option>
              <option className={optionClassName} value="active">
                Active
              </option>
              <option className={optionClassName} value="suspended">
                Suspended
              </option>
              <option className={optionClassName} value="inactive">
                Inactive
              </option>
            </select>
          </div>

          <div className={`${filterGroupClassName} justify-end`}>
            <Button
              variant="primary"
              onClick={() => {
                onSearchChange?.("");
                setStatusFilter("all");
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className={panelClassName}>
        <DataTable<PunterData>
          columns={columns}
          data={filteredPunters}
          pageSize={20}
          onRowClick={onPunterSelect}
          loading={isLoading}
          emptyMessage={
            punters.length === 0
              ? searchText.trim()
                ? "No punters match your search"
                : "No punters found"
              : "No results match your status filter"
          }
        />
      </div>
    </>
  );
}
