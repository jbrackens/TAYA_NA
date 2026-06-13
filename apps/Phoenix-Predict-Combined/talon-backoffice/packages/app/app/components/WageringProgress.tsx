"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { formatCents } from "../lib/format";

interface WageringProgressProps {
  requiredCents: number;
  completedCents: number;
  progressPct: number;
  expiresAt: string;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = target - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export const WageringProgress: React.FC<WageringProgressProps> = ({
  requiredCents,
  completedCents,
  progressPct,
  expiresAt,
}) => {
  const { t } = useTranslation("bonus");
  const daysLeft = daysUntil(expiresAt);
  const isExpired = daysLeft <= 0;
  const clampedPct = Math.min(100, Math.max(0, progressPct));

  return (
    <div className="flex flex-col gap-1.5">
      {/* Progress bar */}
      <progress
        className={`block h-2 w-full appearance-none overflow-hidden rounded-full border-0 bg-[#1a1f3a] [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[#1a1f3a] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500 ${
          clampedPct >= 100
            ? "[&::-moz-progress-bar]:bg-[#22c55e] [&::-webkit-progress-value]:bg-[#22c55e]"
            : "[&::-moz-progress-bar]:bg-[var(--accent)] [&::-webkit-progress-value]:bg-[var(--accent)]"
        }`}
        value={clampedPct}
        max={100}
        aria-label="Wagering progress"
      />

      {/* Labels */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          {t("wageringRequired", {
            completed: formatCents(completedCents, { minimumFractionDigits: 0 }),
            required: formatCents(requiredCents, { minimumFractionDigits: 0 }),
          })}
        </span>
        <span className={isExpired ? "text-red-400" : "text-gray-400"}>
          {isExpired ? t("expired") : t("expiresIn", { days: daysLeft })}
        </span>
      </div>
    </div>
  );
};
