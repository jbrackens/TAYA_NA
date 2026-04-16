'use client';

import React from 'react';
import Link from 'next/link';

interface MarketCardProps {
  ticker: string;
  title: string;
  yesPriceCents: number;
  noPriceCents: number;
  volumeCents: number;
  closeAt: string;
  status: string;
  movement?: 'up' | 'down';
}

export function MarketCard({
  ticker,
  title,
  yesPriceCents,
  noPriceCents,
  volumeCents,
  closeAt,
  status,
  movement,
}: MarketCardProps) {
  const yesWidth = yesPriceCents;
  const timeLeft = getTimeLeft(closeAt);
  const volume = formatCents(volumeCents);

  return (
    <Link href={`/market/${ticker}`} className="block">
      <div className="border border-gray-700 rounded-xl p-4 hover:border-gray-500 transition-colors bg-gray-900/50">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-medium text-white leading-snug flex-1 pr-2">
            {title}
          </h3>
          {status === 'open' && (
            <span className="text-xs text-gray-400 whitespace-nowrap">{timeLeft}</span>
          )}
          {status === 'settled' && (
            <span className="text-xs text-green-400 font-medium">Settled</span>
          )}
        </div>

        {/* Probability bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className={`font-semibold ${movement === 'up' ? 'text-green-400' : movement === 'down' ? 'text-red-400' : 'text-emerald-400'}`}>
              Yes {yesPriceCents}%
            </span>
            <span className="text-red-400 font-semibold">
              No {noPriceCents}%
            </span>
          </div>
          <div className="h-2 bg-red-500/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${yesWidth}%` }}
            />
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Vol: {volume}</span>
          <span className="text-gray-600">{ticker}</span>
        </div>
      </div>
    </Link>
  );
}

function getTimeLeft(closeAt: string): string {
  const diff = new Date(closeAt).getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m left`;
  }
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

function formatCents(cents: number): string {
  if (cents >= 100_000_00) return `$${(cents / 100_00).toFixed(0)}K`;
  if (cents >= 100_00) return `$${(cents / 100).toFixed(0)}`;
  return `$${(cents / 100).toFixed(2)}`;
}
