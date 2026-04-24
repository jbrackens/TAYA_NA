"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface WageringProgressProps {
  requiredCents: number;
  completedCents: number;
  progressPct: number;
  expiresAt: string;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
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
      <div className="w-full h-2 bg-[#1a1f3a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedPct}%`,
            backgroundColor: clampedPct >= 100 ? "#22c55e" : "var(--accent)",
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          {t("wageringRequired", {
            completed: formatCents(completedCents),
            required: formatCents(requiredCents),
          })}
        </span>
        <span className={isExpired ? "text-red-400" : "text-gray-400"}>
          {isExpired ? t("expired") : t("expiresIn", { days: daysLeft })}
        </span>
      </div>
    </div>
  );
};
