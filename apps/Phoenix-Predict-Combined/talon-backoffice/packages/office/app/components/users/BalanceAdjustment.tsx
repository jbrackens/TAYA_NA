"use client";

import { useState } from "react";
import { adminFetch } from "../../lib/admin-fetch";
import { Button, Card, ConfirmModal, Input } from "../shared";

interface BalanceAdjustmentProps {
  userId: string;
  /** Called after a successful adjustment so the parent can refresh. */
  onAdjusted: () => void | Promise<void>;
}

type Direction = "credit" | "debit";

const labelClassName =
  "mb-1 block text-[13px] font-medium tracking-[0.02em] text-[var(--t2,#4a4a4a)]";

const directionButton = (active: boolean) =>
  active
    ? "flex-1 cursor-pointer rounded border-0 p-2.5 text-xs font-semibold bg-[var(--focus-ring,#0e7a53)] text-[var(--bg-deep,#f7f3ed)]"
    : "flex-1 cursor-pointer rounded border-0 p-2.5 text-xs font-semibold bg-[var(--border-1,#e5dfd2)] text-[var(--t2,#4a4a4a)]";

/**
 * Manual balance adjustment (P1-2): drives the existing audited,
 * idempotency-keyed admin wallet routes. Reason is mandatory and every
 * submission passes a confirmation step; four-eyes approval is a separate
 * blocked decision (P0-6) and intentionally not improvised here.
 */
export function BalanceAdjustment({
  userId,
  onAdjusted,
}: BalanceAdjustmentProps) {
  const [direction, setDirection] = useState<Direction>("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const amountPoints = Number(amount);
  const valid =
    Number.isFinite(amountPoints) && amountPoints > 0 && reason.trim() !== "";

  const submit = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch(`/api/v1/admin/wallet/${direction}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amountPointsCents: Math.round(amountPoints * 100),
          idempotencyKey: `admin-ui:${crypto.randomUUID()}`,
          reason: reason.trim(),
        }),
      });
      const payload = (await res.json()) as {
        balancePointsCents?: number;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(
          payload.error?.message ?? `adjustment failed (${res.status})`,
        );
      }
      const balance =
        typeof payload.balancePointsCents === "number"
          ? (payload.balancePointsCents / 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })
          : "?";
      setNotice(
        `${direction === "credit" ? "Credited" : "Debited"} ${amountPoints.toLocaleString()} pts — new balance ${balance} pts`,
      );
      setAmount("");
      setReason("");
      await onAdjusted();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setNotice(message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Card className="mt-5 p-5" data-testid="balance-adjustment-card">
      <h3 className="m-0 mb-3 text-[15px] font-semibold text-[var(--t1,#1a1a1a)]">
        Balance Adjustment
      </h3>

      <div className="mb-3 flex gap-2">
        <button
          className={directionButton(direction === "credit")}
          onClick={() => setDirection("credit")}
          data-testid="adjustment-direction-credit"
        >
          Credit
        </button>
        <button
          className={directionButton(direction === "debit")}
          onClick={() => setDirection("debit")}
          data-testid="adjustment-direction-debit"
        >
          Debit
        </button>
      </div>

      <label className={labelClassName} htmlFor="adjustment-amount">
        Amount (points)
      </label>
      <Input
        id="adjustment-amount"
        className="mb-3 w-full"
        inputMode="decimal"
        placeholder="e.g. 25.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        data-testid="adjustment-amount"
      />

      <label className={labelClassName} htmlFor="adjustment-reason">
        Reason (required)
      </label>
      <Input
        id="adjustment-reason"
        className="mb-4 w-full"
        placeholder="e.g. goodwill points for outage"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        data-testid="adjustment-reason"
      />

      <Button
        variant={direction === "debit" ? "danger" : "primary"}
        className="w-full"
        disabled={!valid || busy}
        onClick={() => setConfirming(true)}
        data-testid="adjustment-submit"
      >
        {direction === "credit" ? "Credit points" : "Debit points"}
      </Button>

      {notice && (
        <p
          className="mt-3 text-[13px] text-[var(--t2,#4a4a4a)]"
          data-testid="adjustment-notice"
        >
          {notice}
        </p>
      )}

      <ConfirmModal
        isOpen={confirming}
        title="Confirm balance adjustment"
        message={`${direction === "credit" ? "Credit" : "Debit"} ${amount || "0"} pts ${
          direction === "credit" ? "to" : "from"
        } ${userId}?`}
        impactSummary={`Reason: ${reason.trim() || "—"}. This posts a ledger entry and is written to the audit log.`}
        confirmText={direction === "credit" ? "Credit" : "Debit"}
        variant={direction === "debit" ? "danger" : "warning"}
        isLoading={busy}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}
