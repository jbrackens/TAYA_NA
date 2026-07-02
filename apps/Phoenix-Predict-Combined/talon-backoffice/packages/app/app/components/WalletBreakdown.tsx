"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "../lib/store/hooks";
import {
  getWalletBreakdown,
  type WalletBreakdown as WalletBreakdownType,
} from "../lib/api/bonus-client";

export const WalletBreakdownDisplay: React.FC = () => {
  const { t } = useTranslation("bonus");
  const [breakdown, setBreakdown] = useState<WalletBreakdownType | null>(null);
  const [loading, setLoading] = useState(true);

  const settings = useAppSelector((state) => state.settings);
  const userId = settings?.userData?.userId;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    getWalletBreakdown(userId)
      .then((data) => {
        if (!cancelled) {
          setBreakdown(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f1225]/60">
        <div className="h-4 w-20 bg-[#1a1f3a] rounded animate-pulse" />
      </div>
    );
  }

  if (!breakdown) return null;

  const hasBonusPoints = breakdown.bonusPointsCents > 0;

  return (
    <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-[#0f1225]/60">
      {/* Total balance — always visible */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {t("totalBalance")}
        </span>
        <span className="text-sm font-semibold text-white">
          {formatPointsFromCents(breakdown.totalPointsCents)}
        </span>
      </div>

      {/* Breakdown - only shown when bonus points exist */}
      {hasBonusPoints && (
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-gray-400">
              {t("basePoints", "Base Points")}
            </span>
            <span className="text-white font-medium">
              {formatPointsFromCents(breakdown.basePointsCents)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-gray-400">
              {t("bonusPoints", "Bonus Points")}
            </span>
            <span className="text-white font-medium">
              {formatPointsFromCents(breakdown.bonusPointsCents)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

function formatPointsFromCents(cents: number): string {
  return `${(cents / 100).toFixed(2)} pts`;
}
