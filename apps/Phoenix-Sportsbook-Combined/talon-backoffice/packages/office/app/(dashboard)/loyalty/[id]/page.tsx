'use client';

export const dynamic = 'force-dynamic';

import { ChangeEvent, CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ErrorBoundary, ErrorState, LoadingSpinner } from '../../../components/shared';

interface LoyaltyAccount {
  accountId: string;
  playerId: string;
  currentTier: string;
  nextTier: string;
  pointsBalance: number;
  pointsEarnedLifetime: number;
  pointsEarned7D: number;
  pointsEarned30D: number;
  pointsEarnedCurrentMonth: number;
  pointsToNextTier: number;
  currentTierAssignedAt?: string;
  lastAccrualAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface LoyaltyLedgerEntry {
  entryId: string;
  entryType: string;
  entrySubtype?: string;
  sourceType: string;
  sourceId: string;
  pointsDelta: number;
  balanceAfter: number;
  createdBy?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

interface LoyaltyTier {
  tierCode: string;
  displayName: string;
  minLifetimePoints?: number;
}

interface ReferralReward {
  referralId: string;
  referrerPlayerId: string;
  referredPlayerId: string;
  qualificationState: string;
  qualifiedAt?: string;
  createdAt: string;
}

function LoyaltyDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const playerId = params?.id as string;
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [ledger, setLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [referrals, setReferrals] = useState<ReferralReward[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [pointsDelta, setPointsDelta] = useState('100');
  const [reason, setReason] = useState('');
  const [entrySubtype, setEntrySubtype] = useState('goodwill');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/loyalty/accounts/${encodeURIComponent(playerId)}?limit=20`, {
        headers: { 'X-Admin-Role': 'admin' },
      });
      if (!response.ok) {
        throw new Error('Failed to load loyalty account');
      }
      const data = await response.json();
      setAccount(data.account || null);
      setLedger(Array.isArray(data.ledger) ? data.ledger : []);
      setTiers(Array.isArray(data.tiers) ? data.tiers : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load loyalty account');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferrals = async () => {
    setReferralsLoading(true);
    try {
      const response = await fetch(`/api/v1/referrals?userId=${encodeURIComponent(playerId)}`);
      if (!response.ok) {
        // Referral endpoint may 404 if no referrals exist — treat as empty
        setReferrals([]);
        return;
      }
      const data = await response.json();
      setReferrals(Array.isArray(data?.items) ? data.items : []);
    } catch (_err: unknown) {
      // Non-critical — don't block the page
      setReferrals([]);
    } finally {
      setReferralsLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    void loadReferrals();
  }, [playerId]);

  const currentTierName = useMemo(
    () => tiers.find((tier) => tier.tierCode === account?.currentTier)?.displayName || account?.currentTier || 'Bronze',
    [tiers, account?.currentTier],
  );
  const nextTierName = useMemo(
    () => tiers.find((tier) => tier.tierCode === account?.nextTier)?.displayName || account?.nextTier || '',
    [tiers, account?.nextTier],
  );

  // Compute tier progress for the progress bar
  const tierProgress = useMemo(() => {
    if (!account) return null;
    const currentTierObj = tiers.find((t) => t.tierCode === account.currentTier);
    const nextTierObj = tiers.find((t) => t.tierCode === account.nextTier);
    if (!nextTierObj?.minLifetimePoints) return null;
    const currentMin = currentTierObj?.minLifetimePoints ?? 0;
    const nextMin = nextTierObj.minLifetimePoints;
    const range = nextMin - currentMin;
    if (range <= 0) return null;
    const earned = account.pointsEarnedLifetime - currentMin;
    const pct = Math.min(100, Math.max(0, (earned / range) * 100));
    return {
      percent: pct,
      pointsToNext: account.pointsToNextTier,
      nextName: nextTierObj.displayName || account.nextTier,
      currentName: currentTierObj?.displayName || account.currentTier,
    };
  }, [account, tiers]);

  const submitAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    const parsedDelta = Number(pointsDelta);
    if (!Number.isFinite(parsedDelta) || parsedDelta === 0) {
      setError('Points delta must be a non-zero number.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required for auditability.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/admin/loyalty/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': 'admin',
        },
        body: JSON.stringify({
          playerId,
          pointsDelta: parsedDelta,
          idempotencyKey: `office-adjust:${playerId}:${Date.now()}`,
          reason: reason.trim(),
          createdBy: 'office-admin',
          entrySubtype,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save loyalty adjustment');
      }
      const data = await response.json();
      setAccount(data.account || null);
      setLedger((current) => [data.entry, ...current].slice(0, 20));
      setReason('');
      setFeedback('Loyalty adjustment applied successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save loyalty adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 style={pageTitleStyle}>Loading loyalty account...</h1>
        <LoadingSpinner centered={true} text="Loading loyalty details..." />
      </div>
    );
  }

  if (error && !account) {
    return (
      <ErrorState
        title="Failed to load loyalty account"
        message={error}
        onRetry={() => void loadDetail()}
        showRetryButton={true}
      />
    );
  }

  if (!account) {
    return (
      <ErrorState
        title="Loyalty account not found"
        message="The requested loyalty account could not be located."
        onRetry={() => router.push('/loyalty')}
        showRetryButton={true}
      />
    );
  }

  return (
    <div>
      <div style={headerBarStyle}>
        <div>
          <h1 style={pageTitleStyle}>
            {account.playerId}
            {account.lastAccrualAt ? (
              <span style={lastAccrualBadgeStyle}>
                Last accrual {new Date(account.lastAccrualAt).toLocaleString()}
              </span>
            ) : null}
          </h1>
          <p style={subtitleStyle}>
            Current tier {currentTierName}
            {account.nextTier ? `, ${account.pointsToNextTier} points to ${nextTierName}` : ', top tier unlocked'}.
          </p>
        </div>
        <div style={inlineActionsStyle}>
          <button style={buttonStyle(true)} onClick={() => router.push('/loyalty')}>
            Back to Loyalty
          </button>
          <span style={badgeStyle(tierVariant(account.currentTier))}>
            {String(currentTierName).toUpperCase()}
          </span>
        </div>
      </div>

      <div style={metricsGridStyle}>
        <MetricCard label="Points Balance" value={account.pointsBalance.toLocaleString()} />
        <MetricCard label="Lifetime Earned" value={account.pointsEarnedLifetime.toLocaleString()} />
        <MetricCard label="7 Day Earned" value={account.pointsEarned7D.toLocaleString()} />
        <MetricCard label="30 Day Earned" value={account.pointsEarned30D.toLocaleString()} />
      </div>

      {/* Tier Progress Bar */}
      {tierProgress ? (
        <div style={progressContainerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#39ff14', fontSize: 13, fontWeight: 700 }}>{tierProgress.currentName}</span>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              {tierProgress.pointsToNext.toLocaleString()} pts to {tierProgress.nextName}
            </span>
          </div>
          <div style={progressTrackStyle}>
            <div style={progressBarStyle(tierProgress.percent)} />
          </div>
        </div>
      ) : !account.nextTier ? (
        <div style={progressContainerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#39ff14', fontSize: 13, fontWeight: 700 }}>{currentTierName}</span>
            <span style={{ color: '#4ade80', fontSize: 12 }}>Top tier reached</span>
          </div>
          <div style={progressTrackStyle}>
            <div style={progressBarStyle(100)} />
          </div>
        </div>
      ) : null}

      {/* Referral Activity */}
      <div style={{ ...surfaceCardStyle, marginBottom: 20 }}>
        <h2 style={sectionTitleStyle}>Referral Activity</h2>
        {referralsLoading ? (
          <div style={helperTextStyle}>Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div style={helperTextStyle}>No referral activity found for this player.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {referrals.map((ref) => (
              <div key={ref.referralId} style={referralRowStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                    {ref.referrerPlayerId === playerId ? (
                      <>Referred {ref.referredPlayerId}</>
                    ) : (
                      <>Referred by {ref.referrerPlayerId}</>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {new Date(ref.createdAt).toLocaleString()}
                    {ref.qualifiedAt ? ` — qualified ${new Date(ref.qualifiedAt).toLocaleString()}` : ''}
                  </div>
                </div>
                <span style={qualificationBadgeStyle(ref.qualificationState)}>
                  {ref.qualificationState}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={gridStyle}>
        <div>
          <div style={surfaceCardStyle}>
            <h2 style={sectionTitleStyle}>Recent Ledger</h2>
            {ledger.length > 0 ? (
              <div style={ledgerListStyle}>
                {ledger.map((entry) => (
                  <div key={entry.entryId} style={ledgerItemStyle}>
                    <div style={ledgerHeadStyle}>
                      <div>
                        <div style={ledgerTitleStyle}>{formatLedgerLabel(entry)}</div>
                        <div style={ledgerMetaStyle}>
                          {new Date(entry.createdAt).toLocaleString()} • source {entry.sourceId}
                        </div>
                      </div>
                      <div style={ledgerDeltaStyle(entry.pointsDelta < 0)}>
                        {entry.pointsDelta > 0 ? '+' : ''}
                        {entry.pointsDelta}
                      </div>
                    </div>
                    <div style={ledgerMetaStyle}>
                      Balance after entry: {entry.balanceAfter.toLocaleString()}
                      {entry.createdBy ? ` • created by ${entry.createdBy}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={helperTextStyle}>No loyalty ledger activity recorded yet.</div>
            )}
          </div>
        </div>

        <div>
          <div style={surfaceCardStyle}>
            <h2 style={sectionTitleStyle}>Manual Adjustment</h2>
            <form style={formStyle} onSubmit={submitAdjustment}>
              <label style={labelStyle}>
                Points Delta
                <input
                  style={inputStyle}
                  value={pointsDelta}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setPointsDelta(event.target.value)}
                  placeholder="e.g. 100 or -50"
                />
              </label>

              <label style={labelStyle}>
                Entry Subtype
                <input
                  style={inputStyle}
                  value={entrySubtype}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setEntrySubtype(event.target.value)}
                  placeholder="goodwill"
                />
              </label>

              <label style={labelStyle}>
                Reason
                <textarea
                  style={textAreaStyle}
                  value={reason}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)}
                  placeholder="Explain why this adjustment is being applied"
                />
              </label>

              <div style={helperTextStyle}>
                Positive values award points. Negative values claw points back. Every adjustment is written to the loyalty ledger.
              </div>

              {feedback ? <div style={feedbackStyle(false)}>{feedback}</div> : null}
              {error ? <div style={feedbackStyle(true)}>{error}</div> : null}

              <button style={buttonStyle(false)} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Apply Adjustment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={surfaceCardStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
    </div>
  );
}

function formatLedgerLabel(entry: LoyaltyLedgerEntry): string {
  if (entry.sourceType === 'bet_settlement') {
    return 'Settled bet reward';
  }
  if (entry.sourceType === 'admin_manual') {
    return 'Manual loyalty adjustment';
  }
  return entry.entrySubtype || entry.entryType;
}

function tierVariant(tier: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (tier) {
    case 'vip':
      return 'danger';
    case 'gold':
      return 'warning';
    case 'silver':
      return 'success';
    default:
      return 'default';
  }
}

function badgeStyle(variant: 'default' | 'success' | 'warning' | 'danger'): CSSProperties {
  const backgrounds: Record<string, string> = {
    default: '#0f3460',
    success: '#065f46',
    warning: '#92400e',
    danger: '#7f1d1d',
  };
  const colors: Record<string, string> = {
    default: '#93c5fd',
    success: '#dcfce7',
    warning: '#fef3c7',
    danger: '#fee2e2',
  };
  return {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: backgrounds[variant],
    color: colors[variant],
  };
}

function qualificationBadgeStyle(state: string): CSSProperties {
  const isQualified = state === 'qualified' || state === 'completed';
  return {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: isQualified ? 'rgba(57, 255, 20, 0.12)' : 'rgba(148, 163, 184, 0.12)',
    color: isQualified ? '#39ff14' : '#94a3b8',
    border: `1px solid ${isQualified ? 'rgba(57, 255, 20, 0.25)' : 'rgba(148, 163, 184, 0.25)'}`,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
}

function buttonStyle(secondary: boolean): CSSProperties {
  return {
    padding: '8px 16px',
    backgroundColor: secondary ? '#0f3460' : '#4a7eff',
    color: secondary ? '#4a7eff' : '#1a1a2e',
    border: secondary ? '1px solid #0f3460' : 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    opacity: 1,
  };
}

function ledgerDeltaStyle(negative: boolean): CSSProperties {
  return {
    fontSize: 18,
    fontWeight: 700,
    color: negative ? '#f87171' : '#39ff14',
  };
}

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    color: isError ? '#fda4af' : '#86efac',
    fontSize: 13,
  };
}

/* ── Style constants ── */

const pageTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 8,
  color: '#ffffff',
  display: 'flex',
  alignItems: 'baseline',
  gap: 12,
  flexWrap: 'wrap',
};

const lastAccrualBadgeStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#94a3b8',
  background: 'rgba(15, 52, 96, 0.6)',
  padding: '3px 8px',
  borderRadius: 4,
  border: '1px solid #1e3a5f',
  whiteSpace: 'nowrap',
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: '#a0a0a0',
  fontSize: 14,
};

const headerBarStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 24,
  flexWrap: 'wrap',
};

const inlineActionsStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
};

const metricsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 16,
  marginBottom: 20,
};

const surfaceCardStyle: CSSProperties = {
  padding: 16,
  backgroundColor: '#16213e',
  border: '1px solid #0f3460',
  borderRadius: 8,
};

const metricLabelStyle: CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const metricValueStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: '#ffffff',
  marginTop: 8,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: 20,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#ffffff',
  margin: '0 0 16px',
};

const ledgerListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const ledgerItemStyle: CSSProperties = {
  border: '1px solid #0f3460',
  borderRadius: 8,
  padding: 14,
  background: 'rgba(15, 52, 96, 0.35)',
};

const ledgerHeadStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  marginBottom: 8,
};

const ledgerTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#ffffff',
};

const ledgerMetaStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  lineHeight: 1.5,
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  color: '#cbd5e1',
  fontSize: 13,
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  backgroundColor: '#0f3460',
  border: '1px solid #0f3460',
  color: '#ffffff',
  borderRadius: 4,
  fontSize: 14,
};

const textAreaStyle: CSSProperties = {
  minHeight: 96,
  padding: '10px 12px',
  backgroundColor: '#0f3460',
  border: '1px solid #0f3460',
  color: '#ffffff',
  borderRadius: 4,
  fontSize: 14,
  resize: 'vertical',
};

const helperTextStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  lineHeight: 1.5,
};

/* Progress bar styles */

const progressContainerStyle: CSSProperties = {
  background: '#16213e',
  border: '1px solid #0f3460',
  borderRadius: 8,
  padding: 16,
  marginBottom: 20,
};

const progressTrackStyle: CSSProperties = {
  width: '100%',
  height: 10,
  background: '#0f172a',
  borderRadius: 5,
  overflow: 'hidden',
};

function progressBarStyle(percent: number): CSSProperties {
  return {
    width: `${percent}%`,
    height: '100%',
    background: 'linear-gradient(90deg, #4a7eff, #39ff14)',
    borderRadius: 5,
    transition: 'width 0.4s ease',
  };
}

/* Referral row styles */

const referralRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  border: '1px solid #0f3460',
  borderRadius: 8,
  background: 'rgba(15, 52, 96, 0.35)',
};

export default function LoyaltyDetailPage() {
  return (
    <ErrorBoundary>
      <LoyaltyDetailPageContent />
    </ErrorBoundary>
  );
}
