'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../lib/store/hooks';
import { selectUserStatus, selectCoolOff } from '../lib/store/settingsSlice';
import { selectCurrentBalance } from '../lib/store/cashierSlice';
import { useAuth } from '../hooks/useAuth';
import { colors, brand, font, radius, spacing } from '../lib/theme';

/**
 * AccountStatusBar — prominent alert banner displayed below the header
 * when the user's account is in a restricted state.
 *
 * Monitors 5 account states via Redux:
 *   1. SELF_EXCLUDED  → error (red)
 *   2. SUSPENDED      → error (red)
 *   3. NEGATIVE_BALANCE → error (red) — also checks balance < 0
 *   4. COOLING_OFF    → warning (amber)
 *   5. UNVERIFIED     → info (blue)
 *
 * Mirrors the old Pages Router AccountStatusBar 1:1 with the same
 * translation keys (namespace: account-status-bar).
 */

type AlertLevel = 'error' | 'warning' | 'info';

interface StatusConfig {
  level: AlertLevel;
  messageKey: string;
  actionKey?: string;
  actionHref?: string;
  actionCallback?: () => void;
}

const LEVEL_STYLES: Record<AlertLevel, { bg: string; border: string; text: string; icon: string }> = {
  error: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
    text: '#fca5a5',
    icon: '⚠️',
  },
  warning: {
    bg: 'rgba(251, 191, 36, 0.08)',
    border: 'rgba(251, 191, 36, 0.25)',
    text: '#fde68a',
    icon: '⏳',
  },
  info: {
    bg: 'rgba(96, 165, 250, 0.08)',
    border: 'rgba(96, 165, 250, 0.25)',
    text: '#93c5fd',
    icon: 'ℹ️',
  },
};

export const AccountStatusBar: React.FC = () => {
  const { t } = useTranslation('account-status-bar');
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redux selectors — these are populated when the user session loads
  const accountStatus = useAppSelector(selectUserStatus);
  const coolOff = useAppSelector(selectCoolOff);
  const balance = useAppSelector(selectCurrentBalance);

  const [dismissed, setDismissed] = useState(false);

  // Determine which status to show (priority order: most severe first)
  const getStatusConfig = useCallback((): StatusConfig | null => {
    if (!isAuthenticated) return null;

    // 1. Self-excluded — highest priority
    if (accountStatus === 'SELF_EXCLUDED') {
      return { level: 'error', messageKey: 'SELF_EXCLUDED' };
    }

    // 2. Suspended
    if (accountStatus === 'SUSPENDED') {
      return { level: 'error', messageKey: 'SUSPENDED' };
    }

    // 3. Negative balance
    if (typeof balance === 'number' && balance < 0) {
      return {
        level: 'error',
        messageKey: 'NEGATIVE_BALANCE',
        actionKey: 'DEPOSIT',
        actionHref: '/cashier',
      };
    }

    // 4. Cooling off
    if (coolOff) {
      return { level: 'warning', messageKey: 'COOLING_OFF' };
    }

    // 5. Unverified
    if (accountStatus === 'UNVERIFIED') {
      return {
        level: 'info',
        messageKey: 'UNVERIFIED',
        actionKey: 'VERIFY',
        actionHref: '/profile',
      };
    }

    return null;
  }, [isAuthenticated, accountStatus, coolOff, balance]);

  const config = getStatusConfig();

  // Nothing to show
  if (!config || dismissed) return null;

  const style = LEVEL_STYLES[config.level];

  const handleAction = () => {
    if (config.actionHref) {
      router.push(config.actionHref);
    }
    if (config.actionCallback) {
      config.actionCallback();
    }
  };

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: `${spacing.md} ${spacing.xl}`,
        background: style.bg,
        borderBottom: `1px solid ${style.border}`,
        fontSize: font.md,
        fontWeight: font.medium,
        color: style.text,
        lineHeight: '1.5',
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{style.icon}</span>

      {/* Message */}
      <span style={{ flex: 1 }}>
        <strong style={{ fontWeight: font.semibold }}>{t('TITLE')}</strong>{' '}
        {t(config.messageKey)}
      </span>

      {/* Action button */}
      {config.actionKey && (
        <button
          onClick={handleAction}
          style={{
            padding: `${spacing.xs} ${spacing.lg}`,
            borderRadius: radius.md,
            border: `1px solid ${style.border}`,
            background: 'transparent',
            color: style.text,
            fontSize: font.sm,
            fontWeight: font.semibold,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = style.bg;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {t(config.actionKey)}
        </button>
      )}

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: radius.sm,
          border: 'none',
          background: 'transparent',
          color: style.text,
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6,
          flexShrink: 0,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '0.6';
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default AccountStatusBar;
