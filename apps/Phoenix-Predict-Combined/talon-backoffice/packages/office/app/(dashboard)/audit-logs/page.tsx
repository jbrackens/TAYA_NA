"use client";

import { AuditLogTable } from "../../components/audit";
import { ErrorBoundary, ErrorState } from "../../components/shared";
import { useState, useEffect } from "react";
import { adminFetch } from "../../lib/admin-fetch";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  dataBefore?: Record<string, any>;
  dataAfter?: Record<string, any>;
}

// GAP-13 audit hash-chain integrity result (GET /api/v1/admin/audit-logs/verify).
interface ChainResult {
  ok: boolean;
  checked?: number;
  brokenAtId?: string;
  brokenAtSeq?: number;
  reason?: string;
}

const entityPrefixMap: Record<string, string> = {
  p: "user",
  m: "market",
};

const deriveEntityType = (action: string, targetId: string) => {
  const prefix = targetId.slice(0, 1);
  if (targetId.slice(1, 2) === ":" && entityPrefixMap[prefix]) {
    return entityPrefixMap[prefix];
  }
  if (action.startsWith("prediction.")) {
    return "market";
  }
  if (action.includes(".")) {
    return action.split(".")[0];
  }
  return "system";
};

const deriveActionLabel = (action: string) => {
  if (action.includes(".")) {
    return action.split(".").slice(1).join(".").toUpperCase();
  }
  return action.toUpperCase();
};

const filterInputClassName =
  "min-w-[200px] flex-1 rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--border-1,#e5dfd2)] px-4 py-2.5 text-sm text-[var(--t1,#1a1a1a)] placeholder:text-[var(--t2,#4a4a4a)] focus:border-[var(--focus-ring,#0e7a53)] focus:outline-none";

const filterSelectClassName =
  "cursor-pointer rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--border-1,#e5dfd2)] px-4 py-2.5 text-sm text-[var(--t1,#1a1a1a)] focus:border-[var(--focus-ring,#0e7a53)] focus:outline-none";

const optionClassName =
  "bg-[var(--surface-1,#ffffff)] text-[var(--t1,#1a1a1a)]";

function AuditLogsPageContent() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [chain, setChain] = useState<ChainResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const res = await adminFetch("/api/v1/admin/audit-logs/verify");
      if (!res.ok) throw new Error(`verify failed (${res.status})`);
      setChain((await res.json()) as ChainResult);
    } catch (err: unknown) {
      setChain({
        ok: false,
        reason: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await adminFetch(
          "/api/v1/admin/audit-logs?page=1&pageSize=100",
        );
        if (!response.ok) {
          throw new Error("Failed to load audit logs");
        }
        const data = await response.json();
        let items: AuditLogEntry[] = (
          Array.isArray(data?.items) ? data.items : []
        ).map((item: any) => {
          const entityType = deriveEntityType(
            item.action || "",
            item.targetId || "",
          );
          return {
            id: item.id,
            timestamp: item.occurredAt,
            actor: item.actorId,
            action: deriveActionLabel(item.action || ""),
            entityType,
            entityId: item.targetId || "system",
            dataAfter: item.details ? { details: item.details } : undefined,
          } as AuditLogEntry;
        });

        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          items = items.filter(
            (log) =>
              log.actor.toLowerCase().includes(search) ||
              log.entityType.toLowerCase().includes(search) ||
              log.entityId.toLowerCase().includes(search),
          );
        }

        if (actionFilter) {
          items = items.filter((log) => log.action === actionFilter);
        }

        if (resourceFilter) {
          items = items.filter((log) => log.entityType === resourceFilter);
        }

        setLogs(items);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load audit logs",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [searchTerm, actionFilter, resourceFilter, reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setLogs([]);
    setReloadKey((value) => value + 1);
  };

  return (
    <div>
      <h1 className="mb-2 text-[28px] font-bold text-[var(--t1,#1a1a1a)]">
        Audit Logs
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          className="cursor-pointer rounded border-0 bg-[var(--focus-ring,#0e7a53)] px-4 py-2 text-sm font-semibold text-[var(--bg-deep,#f7f3ed)] disabled:opacity-60"
          onClick={verifyChain}
          disabled={verifying}
          data-testid="audit-verify-chain"
        >
          {verifying ? "Verifying…" : "Verify chain integrity"}
        </button>
        {chain && (
          <span
            className={`rounded px-3 py-1.5 text-sm font-semibold ${
              chain.ok
                ? "bg-[rgba(31,166,94,0.15)] text-[var(--accent-lo,#1fa65e)]"
                : "bg-[rgba(168,71,45,0.15)] text-[var(--no-text,#a8472d)]"
            }`}
            data-testid="audit-chain-status"
          >
            {chain.ok
              ? chain.reason
                ? `Not chained — ${chain.reason}`
                : `✓ Chain intact (${chain.checked ?? 0} entries verified)`
              : `✗ Tamper detected${
                  chain.brokenAtId ? ` at ${chain.brokenAtId}` : ""
                }${chain.reason ? ` — ${chain.reason}` : ""}`}
          </span>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-3 max-[768px]:flex-col">
        <input
          className={filterInputClassName}
          type="text"
          placeholder="Search by resource or admin..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className={filterSelectClassName}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option className={optionClassName} value="">
            All Actions
          </option>
          <option className={optionClassName} value="CREATE">
            Create
          </option>
          <option className={optionClassName} value="UPDATE">
            Update
          </option>
          <option className={optionClassName} value="DELETE">
            Delete
          </option>
          <option className={optionClassName} value="LOGIN">
            Login
          </option>
          <option className={optionClassName} value="LOGOUT">
            Logout
          </option>
        </select>

        <select
          className={filterSelectClassName}
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
        >
          <option className={optionClassName} value="">
            All Resources
          </option>
          <option className={optionClassName} value="user">
            User
          </option>
          <option className={optionClassName} value="market">
            Market
          </option>
          <option className={optionClassName} value="alert">
            Alert
          </option>
        </select>
      </div>

      {error ? (
        <ErrorState
          title="Failed to load audit logs"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      ) : (
        <AuditLogTable logs={logs} isLoading={isLoading} />
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <ErrorBoundary>
      <AuditLogsPageContent />
    </ErrorBoundary>
  );
}
