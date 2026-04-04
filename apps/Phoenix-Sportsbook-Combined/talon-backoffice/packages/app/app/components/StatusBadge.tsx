'use client';

import React from 'react';

interface StatusBadgeProps {
  status: 'success' | 'pending' | 'error' | 'info' | 'warning';
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusColors: Record<
    string,
    { bg: string; color: string }
  > = {
    success: {
      bg: 'rgba(34, 197, 94, 0.15)',
      color: '#22c55e',
    },
    pending: {
      bg: 'rgba(249, 115, 22, 0.15)',
      color: '#f97316',
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.15)',
      color: '#3b82f6',
    },
    warning: {
      bg: 'rgba(234, 179, 8, 0.15)',
      color: '#eab308',
    },
  };

  const colors = statusColors[status];

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: colors.bg,
    color: colors.color,
    whiteSpace: 'nowrap',
  };

  const dotStyle: React.CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: colors.color,
  };

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span style={badgeStyle}>
      <span style={dotStyle} />
      {displayLabel}
    </span>
  );
}
