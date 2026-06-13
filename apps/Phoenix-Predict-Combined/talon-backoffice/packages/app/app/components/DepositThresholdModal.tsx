"use client";

import Modal from "./Modal";
import { formatDollars } from "../lib/format";

interface DepositThresholdModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  currentLimit: number;
}

export default function DepositThresholdModal({
  open,
  onClose,
  onConfirm,
  amount,
  currentLimit,
}: DepositThresholdModalProps) {
  const isExceeding = amount > currentLimit;

  const warningClass = isExceeding
    ? "border-[#ef4444] bg-[rgba(239,68,68,0.1)] text-[#fecaca]"
    : "border-[var(--accent)] bg-[rgba(43,228,128,0.1)] text-[#fed7aa]";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Deposit Limit Warning"
      maxWidth={400}
    >
      <div className="flex flex-col gap-4">
        <div className={`rounded border p-3 text-[13px] ${warningClass}`}>
          {isExceeding
            ? "Your deposit amount exceeds your current limit. Please confirm to proceed."
            : "Your deposit amount is approaching your deposit limit. Please review before confirming."}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between rounded bg-[#0a0e18] px-3 py-2.5 text-[13px]">
            <span className="text-[#64748b]">Current Daily Limit:</span>
            <span className="font-semibold text-[#e2e8f0]">
              {formatDollars(currentLimit)}
            </span>
          </div>
          <div className="flex justify-between rounded bg-[#0a0e18] px-3 py-2.5 text-[13px]">
            <span className="text-[#64748b]">Requested Deposit:</span>
            <span className="font-semibold text-[#e2e8f0]">
              {formatDollars(amount)}
            </span>
          </div>
          <div
            className={`flex justify-between rounded border-t border-[#1a1f3a] px-3 py-2.5 text-[13px] ${
              isExceeding ? "bg-[rgba(239,68,68,0.05)]" : "bg-[#0a0e18]"
            }`}
          >
            <span className="text-[#64748b]">Difference:</span>
            <span
              className={`font-semibold ${
                isExceeding ? "text-[var(--no)]" : "text-[#cbd5e1]"
              }`}
            >
              {isExceeding ? "+" : "-"}
              {formatDollars(Math.abs(amount - currentLimit))}
            </span>
          </div>
        </div>

        <div className="mt-2 flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded border-0 bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-[#0f1225] transition-all duration-200 hover:bg-[#ea580c]"
          >
            Continue
          </button>
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded border border-[#64748b] bg-transparent px-4 py-2.5 text-[13px] font-semibold text-[#64748b] transition-all duration-200 hover:bg-[rgba(100,116,139,0.1)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
