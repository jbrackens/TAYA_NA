"use client";

import { Badge } from "../shared";
import { useState } from "react";
import { DataTable, ColumnDef } from "../shared/DataTable";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  dataBefore?: Record<string, any>;
  dataAfter?: Record<string, any>;
}

interface AuditLogTableProps {
  logs?: AuditLogEntry[];
  isLoading?: boolean;
}

const detailLabelClassName = "mb-1 text-xs text-[var(--t2,#4a4a4a)]";
const detailValueClassName = "text-sm font-semibold text-[var(--t1,#1a1a1a)]";
const diffLabelClassName =
  "mb-2 text-[13px] font-semibold text-[var(--t2,#4a4a4a)]";
const jsonDiffClassName =
  "mb-3 overflow-x-auto rounded bg-[var(--border-1,#e5dfd2)] p-3 font-['Courier_New',monospace] text-xs text-[var(--focus-ring,#0e7a53)]";

export function AuditLogTable({
  logs = [],
  isLoading = false,
}: AuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expanded = logs.find((l) => l.id === expandedId);

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: "timestamp",
      label: "Timestamp",
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: "actor",
      label: "Actor",
      sortable: true,
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (value) => <Badge $variant="default">{value}</Badge>,
    },
    {
      key: "entityType",
      label: "Entity Type",
      sortable: true,
    },
    {
      key: "entityId",
      label: "Entity ID",
      sortable: true,
      render: (value) => (
        <span className="font-mono text-xs text-[var(--t2,#4a4a4a)]">
          {value.substring(0, 8)}...
        </span>
      ),
    },
  ];

  const handleRowClick = (log: AuditLogEntry) => {
    if (log.dataBefore || log.dataAfter) {
      setExpandedId(log.id);
    }
  };

  return (
    <>
      <div className="rounded-md border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-5">
        <h3 className="m-0 mb-4 text-base font-semibold text-[var(--t1,#1a1a1a)]">
          Audit Log
        </h3>
        <DataTable<AuditLogEntry>
          columns={columns}
          data={logs}
          pageSize={25}
          onRowClick={handleRowClick}
          loading={isLoading}
          emptyMessage="No audit logs available"
        />
      </div>

      <div
        className={`fixed inset-0 z-[999] items-center justify-center bg-black/50 ${
          expanded ? "flex" : "hidden"
        }`}
        onClick={() => setExpandedId(null)}
      >
        {expanded && (
          <div
            className="max-h-[80vh] w-[90%] max-w-[600px] overflow-y-auto rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="m-0 mb-4 text-lg font-bold text-[var(--t1,#1a1a1a)]">
              Audit Details
            </h2>

            <div className="mb-4">
              <div className={detailLabelClassName}>Action</div>
              <div className={detailValueClassName}>
                {expanded.action} on {expanded.entityType} ({expanded.entityId})
              </div>
            </div>

            <div className="mb-4">
              <div className={detailLabelClassName}>Actor</div>
              <div className="text-sm font-semibold text-[var(--focus-ring,#0e7a53)]">
                {expanded.actor}
              </div>
            </div>

            <div className="mb-4">
              <div className={detailLabelClassName}>Timestamp</div>
              <div className="text-sm text-[var(--t1,#1a1a1a)]">
                {new Date(expanded.timestamp).toLocaleString()}
              </div>
            </div>

            {expanded.dataBefore && (
              <>
                <div className={diffLabelClassName}>Before</div>
                <div className={jsonDiffClassName}>
                  {JSON.stringify(expanded.dataBefore, null, 2)}
                </div>
              </>
            )}

            {expanded.dataAfter && (
              <>
                <div className={diffLabelClassName}>After</div>
                <div className={jsonDiffClassName}>
                  {JSON.stringify(expanded.dataAfter, null, 2)}
                </div>
              </>
            )}

            <button
              className="mt-4 cursor-pointer rounded border-0 bg-[var(--focus-ring,#0e7a53)] px-4 py-2 font-semibold text-[var(--bg-deep,#f7f3ed)]"
              onClick={() => setExpandedId(null)}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}
