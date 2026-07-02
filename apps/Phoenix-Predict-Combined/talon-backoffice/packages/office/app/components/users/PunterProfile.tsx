"use client";

import { Badge, Button, Card } from "../shared";
import { useState } from "react";

type PunterProfileTab = "overview" | "trades" | "wallet" | "kyc" | "limits";

export interface PunterProfileData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: "active" | "suspended" | "inactive";
  verificationStatus: "verified" | "pending" | "failed";
  balance: number;
  portfolioValue: number;
  totalPredictions: number;
  openPositions: number;
  accuracyPct: number;
  pnl: number;
  unrealizedPnl: number;
}

export interface SettlementRow {
  id: string;
  marketId: string;
  side: string;
  quantity: number;
  realizedPointsCents: number;
  settlementPointsCents: number;
  paidAt: string;
}

export interface WalletLedgerRow {
  entryId: string;
  type: string;
  amountPointsCents: number;
  balancePointsCents: number;
  reason?: string;
  transactionTime: string;
}

export interface KYCTabDocument {
  id: string;
  type: string;
  issuingCountry?: string;
  status: string;
  rejectReason?: string;
  submittedAt: string;
}

export interface KYCTabData {
  status: string;
  riskLevel?: string;
  rejectionReason?: string;
  lastVerifiedAt?: string;
  documents: KYCTabDocument[];
}

export interface RGLimitRow {
  period: string;
  limitCents: number;
  usedCents: number;
  remainingCents: number;
}

export interface RGTabData {
  isBlocked: boolean;
  isOnCoolOff: boolean;
  coolOffUntil?: string;
  isExcluded: boolean;
  exclusionType?: string;
  excludedUntil?: string;
  depositLimits: RGLimitRow[];
  betLimits: RGLimitRow[];
}

interface PunterProfileProps {
  punter?: PunterProfileData;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  actionsAvailable?: boolean;
  settlements?: SettlementRow[];
  walletLedger?: WalletLedgerRow[];
  /** KYC state from /api/v1/admin/kyc/users/{id}; undefined = unavailable */
  kyc?: KYCTabData;
  /** RG state from /api/v1/admin/rg/restrictions; undefined = unavailable */
  rg?: RGTabData;
}

const pointAmount = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const points = (n: number) => `${pointAmount(n)} pts`;
const pointsFromCents = (c: number) => points(c / 100);
const signedPoints = (n: number) =>
  `${n < 0 ? "-" : "+"}${points(Math.abs(n))}`;
const signedPointsFromCents = (c: number) =>
  `${c < 0 ? "-" : "+"}${pointsFromCents(Math.abs(c))}`;
const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleString() : "—");

const infoRowClassName =
  "flex items-center justify-between border-b border-[var(--border-1,#e5dfd2)] py-3 last:border-b-0";
const infoLabelClassName = "text-xs text-[var(--t2,#4a4a4a)]";
const infoValueBaseClassName = "text-[13px] font-semibold";
const infoValueClassName = `${infoValueBaseClassName} text-[var(--t1,#1a1a1a)]`;
const tabButtonBaseClassName =
  "cursor-pointer rounded border-0 p-3 text-xs font-semibold transition-all duration-200 ease-[ease]";
const tabContentClassName = "text-[var(--t2,#4a4a4a)]";
const histThClassName =
  "whitespace-nowrap border-b border-[var(--border-1,#e5dfd2)] px-2.5 py-2 text-left font-semibold text-[var(--t2,#4a4a4a)]";
const histTdBaseClassName =
  "whitespace-nowrap border-b border-[var(--border-1,#e5dfd2)] px-2.5 py-2";
const histTdClassName = `${histTdBaseClassName} text-[var(--t1,#1a1a1a)]`;
const positivePointClassName = "text-[var(--accent-lo,#1fa65e)]";
const negativePointClassName = "text-[var(--no-text,#a8472d)]";

function tabButtonClassName(active: boolean) {
  return active
    ? `${tabButtonBaseClassName} bg-[var(--focus-ring,#0e7a53)] text-[var(--bg-deep,#f7f3ed)] hover:bg-[var(--focus-ring,#0e7a53)]`
    : `${tabButtonBaseClassName} bg-[var(--border-1,#e5dfd2)] text-[var(--t2,#4a4a4a)] hover:bg-[rgba(74,126,255,0.2)]`;
}

export function PunterProfile({
  punter,
  onAction,
  actionsAvailable = true,
  settlements = [],
  walletLedger = [],
  kyc,
  rg,
}: PunterProfileProps) {
  const [activeTab, setActiveTab] = useState<PunterProfileTab>("overview");

  if (!punter) {
    return (
      <div className="p-10 text-center text-[var(--t2,#4a4a4a)]">
        Select a punter to view profile
      </div>
    );
  }

  const initials = punter.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const statusColor = {
    active: "success",
    suspended: "danger",
    inactive: "default",
  } as const;

  const verificationColor = {
    verified: "success",
    pending: "warning",
    failed: "danger",
  } as const;
  const canSuspend = actionsAvailable && punter.status !== "suspended";
  const canActivate = actionsAvailable && punter.status === "suspended";

  return (
    <div className="grid grid-cols-[1fr_2fr] gap-5 max-[1024px]:grid-cols-1">
      <div>
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--focus-ring)_0%,#2e5cb8_100%)] text-2xl font-bold text-[var(--t1,#1a1a1a)]">
              {initials}
            </div>
            <div className="flex-1">
              <h2 className="m-0 mb-1 text-lg font-bold text-[var(--t1,#1a1a1a)]">
                {punter.name}
              </h2>
              <p className="m-0 mb-2 text-[13px] text-[var(--t2,#4a4a4a)]">
                {punter.email}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge $variant={statusColor[punter.status]}>
                  {punter.status.toUpperCase()}
                </Badge>
                <Badge $variant={verificationColor[punter.verificationStatus]}>
                  {punter.verificationStatus.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <div className={infoRowClassName}>
            <span className={infoLabelClassName}>Member Since</span>
            <span className={infoValueClassName}>
              {new Date(punter.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className={infoRowClassName}>
            <span className={infoLabelClassName}>Point Balance</span>
            <span className={infoValueClassName}>{points(punter.balance)}</span>
          </div>
          <div className={infoRowClassName}>
            <span className={infoLabelClassName}>Portfolio Points</span>
            <span className={infoValueClassName}>
              {points(punter.portfolioValue)}
            </span>
          </div>
          <div className={infoRowClassName}>
            <span className={infoLabelClassName}>Open Positions</span>
            <span className={infoValueClassName}>
              {punter.openPositions.toLocaleString()}
            </span>
          </div>
          <div className={infoRowClassName}>
            <span className={infoLabelClassName}>Total Predictions</span>
            <span className={infoValueClassName}>
              {punter.totalPredictions.toLocaleString()}
            </span>
          </div>
          <div className={infoRowClassName}>
            <span className={infoLabelClassName}>Accuracy</span>
            <span className={infoValueClassName}>
              {punter.accuracyPct.toFixed(1)}%
            </span>
          </div>
          <div className={infoRowClassName}>
            <span className={infoLabelClassName}>Realized Points</span>
            <span
              className={`${infoValueBaseClassName} ${
                punter.pnl >= 0
                  ? positivePointClassName
                  : negativePointClassName
              }`}
            >
              {signedPoints(punter.pnl)}
            </span>
          </div>
          <div className={infoRowClassName}>
            <span className={infoLabelClassName}>Unrealized Points</span>
            <span
              className={`${infoValueBaseClassName} ${
                punter.unrealizedPnl >= 0
                  ? positivePointClassName
                  : negativePointClassName
              }`}
            >
              {signedPoints(punter.unrealizedPnl)}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                onAction?.(
                  punter.status === "suspended" ? "activate" : "suspend",
                )
              }
              disabled={!canSuspend && !canActivate}
            >
              {punter.status === "suspended"
                ? "Activate Account"
                : "Suspend Account"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const content = window.prompt(
                  "Add an admin note for this punter:",
                );
                if (content && content.trim()) {
                  onAction?.("addNote", { content: content.trim() });
                }
              }}
              disabled={!actionsAvailable}
            >
              Add Note
            </Button>
          </div>

          <div className="mt-3 text-xs leading-[1.5] text-[var(--t2,#4a4a4a)]">
            {actionsAvailable
              ? "Suspend, activate, and admin notes are live. Force password reset is awaiting auth-service support."
              : "Admin account mutations are read-only here until the Go backoffice mutation routes are implemented."}
          </div>
        </Card>
      </div>

      <div>
        <Card className="p-5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            <button
              className={tabButtonClassName(activeTab === "overview")}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={tabButtonClassName(activeTab === "trades")}
              onClick={() => setActiveTab("trades")}
            >
              Trade History
            </button>
            <button
              className={tabButtonClassName(activeTab === "wallet")}
              onClick={() => setActiveTab("wallet")}
            >
              Point Ledger
            </button>
            <button
              className={tabButtonClassName(activeTab === "kyc")}
              onClick={() => setActiveTab("kyc")}
              data-testid="profile-kyc-tab"
            >
              KYC
            </button>
            <button
              className={tabButtonClassName(activeTab === "limits")}
              onClick={() => setActiveTab("limits")}
              data-testid="profile-limits-tab"
            >
              Limits
            </button>
          </div>
        </Card>

        <Card className="border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-5">
          {activeTab === "overview" && (
            <div className={tabContentClassName}>
              <h4 className="mt-0 text-[var(--t1,#1a1a1a)]">
                Account Overview
              </h4>
              <p>
                Detailed account information and activity logs would be
                displayed here.
              </p>
            </div>
          )}
          {activeTab === "trades" && (
            <div className={tabContentClassName}>
              <h4 className="mt-0 text-[var(--t1,#1a1a1a)]">Trade History</h4>
              {settlements.length === 0 ? (
                <p>No settled trades yet.</p>
              ) : (
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className={histThClassName}>Market</th>
                      <th className={histThClassName}>Side</th>
                      <th className={histThClassName}>Qty</th>
                      <th className={histThClassName}>Point Change</th>
                      <th className={histThClassName}>Points Returned</th>
                      <th className={histThClassName}>Settled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => (
                      <tr key={s.id}>
                        <td className={histTdClassName}>
                          {s.marketId.slice(0, 8)}
                        </td>
                        <td className={histTdClassName}>
                          {s.side.toUpperCase()}
                        </td>
                        <td className={histTdClassName}>
                          {s.quantity.toLocaleString()}
                        </td>
                        <td
                          className={`${histTdBaseClassName} ${
                            s.realizedPointsCents < 0
                              ? negativePointClassName
                              : positivePointClassName
                          }`}
                        >
                          {signedPointsFromCents(s.realizedPointsCents)}
                        </td>
                        <td className={histTdClassName}>
                          {pointsFromCents(s.settlementPointsCents)}
                        </td>
                        <td className={histTdClassName}>{fmtDate(s.paidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeTab === "wallet" && (
            <div className={tabContentClassName}>
              <h4 className="mt-0 text-[var(--t1,#1a1a1a)]">Point Ledger</h4>
              {walletLedger.length === 0 ? (
                <p>No point ledger entries yet.</p>
              ) : (
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className={histThClassName}>Type</th>
                      <th className={histThClassName}>Point Movement</th>
                      <th className={histThClassName}>Point Balance</th>
                      <th className={histThClassName}>Reason</th>
                      <th className={histThClassName}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletLedger.map((e) => (
                      <tr key={e.entryId}>
                        <td className={histTdClassName}>{e.type}</td>
                        <td
                          className={`${histTdBaseClassName} ${
                            e.type.toLowerCase() === "debit"
                              ? negativePointClassName
                              : positivePointClassName
                          }`}
                        >
                          {e.type.toLowerCase() === "debit" ? "-" : "+"}
                          {pointsFromCents(Math.abs(e.amountPointsCents))}
                        </td>
                        <td className={histTdClassName}>
                          {pointsFromCents(e.balancePointsCents)}
                        </td>
                        <td className={histTdClassName}>{e.reason || "—"}</td>
                        <td className={histTdClassName}>
                          {fmtDate(e.transactionTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeTab === "kyc" && (
            <div
              className={tabContentClassName}
              data-testid="profile-kyc-content"
            >
              <h4 className="mt-0 text-[var(--t1,#1a1a1a)]">
                Identity Verification
              </h4>
              {!kyc ? (
                <p>KYC state unavailable (requires the compliance store).</p>
              ) : (
                <>
                  <div className={infoRowClassName}>
                    <span className={infoLabelClassName}>KYC status</span>
                    <Badge
                      variant={
                        kyc.status === "approved"
                          ? "success"
                          : kyc.status === "pending"
                            ? "warning"
                            : kyc.status === "declined" ||
                                kyc.status === "blocked"
                              ? "danger"
                              : "default"
                      }
                    >
                      {kyc.status}
                    </Badge>
                  </div>
                  <div className={infoRowClassName}>
                    <span className={infoLabelClassName}>Risk level</span>
                    <span className={infoValueClassName}>
                      {kyc.riskLevel || "unknown"}
                    </span>
                  </div>
                  {kyc.rejectionReason && (
                    <div className={infoRowClassName}>
                      <span className={infoLabelClassName}>
                        Rejection reason
                      </span>
                      <span className={infoValueClassName}>
                        {kyc.rejectionReason}
                      </span>
                    </div>
                  )}
                  {kyc.lastVerifiedAt && (
                    <div className={infoRowClassName}>
                      <span className={infoLabelClassName}>Last verified</span>
                      <span className={infoValueClassName}>
                        {fmtDate(kyc.lastVerifiedAt)}
                      </span>
                    </div>
                  )}
                  <h4 className="mt-5 text-[var(--t1,#1a1a1a)]">Documents</h4>
                  {kyc.documents.length === 0 ? (
                    <p>No documents submitted.</p>
                  ) : (
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr>
                          <th className={histThClassName}>Type</th>
                          <th className={histThClassName}>Country</th>
                          <th className={histThClassName}>Status</th>
                          <th className={histThClassName}>Submitted</th>
                          <th className={histThClassName}>Reject reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kyc.documents.map((d) => (
                          <tr key={d.id}>
                            <td className={histTdClassName}>{d.type}</td>
                            <td className={histTdClassName}>
                              {d.issuingCountry || "—"}
                            </td>
                            <td className={histTdClassName}>{d.status}</td>
                            <td className={histTdClassName}>
                              {fmtDate(d.submittedAt)}
                            </td>
                            <td className={histTdClassName}>
                              {d.rejectReason || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p className="mt-4 text-xs text-[var(--t3,#8b8378)]">
                    Approve or decline from the{" "}
                    <a
                      href="/compliance/kyc"
                      className="font-medium text-[var(--focus-ring,#0e7a53)]"
                    >
                      KYC Review
                    </a>{" "}
                    queue.
                  </p>
                </>
              )}
            </div>
          )}
          {activeTab === "limits" && (
            <div
              className={tabContentClassName}
              data-testid="profile-limits-content"
            >
              <h4 className="mt-0 text-[var(--t1,#1a1a1a)]">
                Responsible-Play Limits &amp; Self-Exclusion
              </h4>
              {!rg ? (
                <p>
                  Responsible-gambling state unavailable (requires the
                  compliance store).
                </p>
              ) : (
                <>
                  <div className={infoRowClassName}>
                    <span className={infoLabelClassName}>Account blocked</span>
                    <Badge $variant={rg.isBlocked ? "danger" : "success"}>
                      {rg.isBlocked ? "BLOCKED" : "NO"}
                    </Badge>
                  </div>
                  <div className={infoRowClassName}>
                    <span className={infoLabelClassName}>Self-exclusion</span>
                    <Badge $variant={rg.isExcluded ? "danger" : "success"}>
                      {rg.isExcluded
                        ? `${(rg.exclusionType || "excluded").toUpperCase()}${
                            rg.excludedUntil
                              ? ` until ${fmtDate(rg.excludedUntil)}`
                              : ""
                          }`
                        : "NONE"}
                    </Badge>
                  </div>
                  <div className={infoRowClassName}>
                    <span className={infoLabelClassName}>Cool-off</span>
                    <Badge $variant={rg.isOnCoolOff ? "warning" : "success"}>
                      {rg.isOnCoolOff
                        ? `ACTIVE${rg.coolOffUntil ? ` until ${fmtDate(rg.coolOffUntil)}` : ""}`
                        : "NONE"}
                    </Badge>
                  </div>

                  <h4 className="mt-5 text-[var(--t1,#1a1a1a)]">
                    Point-Use Limits
                  </h4>
                  {rgLimitTable(rg.depositLimits)}

                  <h4 className="mt-5 text-[var(--t1,#1a1a1a)]">
                    Prediction Limits
                  </h4>
                  {rgLimitTable(rg.betLimits)}
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  function rgLimitTable(rows: RGLimitRow[]) {
    if (rows.length === 0) {
      return <p>No limits set.</p>;
    }
    return (
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={histThClassName}>Period</th>
            <th className={histThClassName}>Limit</th>
            <th className={histThClassName}>Used</th>
            <th className={histThClassName}>Remaining</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period}>
              <td className={histTdClassName}>{row.period}</td>
              <td className={histTdClassName}>
                {pointsFromCents(row.limitCents)}
              </td>
              <td className={histTdClassName}>
                {pointsFromCents(row.usedCents)}
              </td>
              <td className={histTdClassName}>
                {pointsFromCents(row.remainingCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
