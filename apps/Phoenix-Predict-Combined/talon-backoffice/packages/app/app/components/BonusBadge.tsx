"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface BonusBadgeProps {
  type: "bonus" | "freebet";
}

/**
 * Small indicator badge for bets placed with bonus or free bet funds.
 * Used in bet history and my-bets views.
 */
export const BonusBadge: React.FC<BonusBadgeProps> = ({ type }) => {
  const { t } = useTranslation("bonus");

  const label = type === "freebet" ? t("freeBetApplied") : t("bonusFunded");
  const bgColor = type === "freebet" ? "bg-blue-500/20" : "bg-yellow-500/20";
  const textColor = type === "freebet" ? "text-blue-400" : "text-yellow-400";

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${bgColor} ${textColor}`}
    >
      {label}
    </span>
  );
};
