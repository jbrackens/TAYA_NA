"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getBalance, Balance } from "../lib/api/wallet-client";
import { formatWholePoints } from "./prediction/market-display";
import { Spinner } from "./Spinner";

interface CurrentBalanceProps {
  compact?: boolean;
}

export default function CurrentBalance({
  compact = false,
}: CurrentBalanceProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchBalance = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBalance(user.id);
        setBalance(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load balance";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [user?.id]);

  if (!user) {
    return null;
  }

  if (loading) {
    return <Spinner size={compact ? 14 : 18} color="#64748b" />;
  }

  if (error) {
    return (
      <div
        className={`${compact ? "text-[13px]" : "text-sm"} text-[var(--no)]`}
      >
        {error}
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  // Points unit-model (2026-07-07): wallet-client normalizers return WHOLE
  // Points — render via the shared whole-point formatter (P10, 2026-07-12).
  const availableAmount = formatWholePoints(balance.availableBalance);
  const pendingAmount = formatWholePoints(balance.reservedBalance);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Points:</span>
        <span className="text-[13px] font-semibold text-slate-200">
          {availableAmount}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded border border-[#1a1f3a] bg-[#0a0e18] px-4 py-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Available Points</span>
          <span className="text-base font-semibold text-slate-200">
            {availableAmount}
          </span>
        </div>
        {balance.reservedBalance > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Locked Points</span>
            <span className="text-sm text-slate-300">{pendingAmount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
