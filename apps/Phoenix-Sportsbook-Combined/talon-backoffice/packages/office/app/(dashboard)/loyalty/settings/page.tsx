'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { CSSProperties, ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary, ErrorState, LoadingSpinner } from '../../../components/shared';

interface LoyaltyTier {
  tierCode: string;
  displayName: string;
  rank: number;
  minLifetimePoints: number;
  minRolling30dPoints?: number;
  benefits?: Record<string, string>;
  active: boolean;
}

interface LoyaltyRule {
  ruleId: string;
  name: string;
  sourceType: string;
  active: boolean;
  multiplier: number;
  minQualifiedStakeCents: number;
  eligibleSportIds?: string[];
  eligibleBetTypes?: string[];
  maxPointsPerEvent?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

/** Convert an RFC3339 string to a datetime-local input value (YYYY-MM-DDTHH:mm). */
function rfc3339ToLocal(rfc: string | undefined): string {
  if (!rfc) return '';
  try {
    const d = new Date(rfc);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

/** Convert a datetime-local value back to an RFC3339 string with UTC offset. */
function localToRfc3339(local: string): string {
  if (!local) return '';
  try {
    const d = new Date(local);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch {
    return '';
  }
}

function LoyaltySettingsPageContent() {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [rules, setRules] = useState<LoyaltyRule[]>([]);
  const [selectedTierCode, setSelectedTierCode] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [tierDraft, setTierDraft] = useState<LoyaltyTier | null>(null);
  const [ruleDraft, setRuleDraft] = useState<LoyaltyRule | null>(null);
  const [referralBonusPoints, setReferralBonusPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTier, setIsSavingTier] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [ruleMode, setRuleMode] = useState<'edit' | 'create'>('edit');
  const [newRuleDraft, setNewRuleDraft] = useState<Omit<LoyaltyRule, 'ruleId'>>({
    name: '',
    sourceType: 'bet_settlement',
    active: true,
    multiplier: 1.0,
    minQualifiedStakeCents: 0,
    maxPointsPerEvent: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Benefits editor state — kept separate and merged into tierDraft on save
  const [benefitRows, setBenefitRows] = useState<{ key: string; value: string }[]>([]);

  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/admin/loyalty/config', {
        headers: { 'X-Admin-Role': 'admin' },
      });
      if (!response.ok) {
        throw new Error('Failed to load loyalty configuration');
      }
      const data = await response.json();
      const nextTiers = Array.isArray(data?.tiers) ? data.tiers : [];
      const nextRules = Array.isArray(data?.rules) ? data.rules : [];
      setTiers(nextTiers);
      setRules(nextRules);
      setReferralBonusPoints(Number(data?.referralBonusPoints || 0));
      const initialTier = nextTiers[0] || null;
      const initialRule = nextRules[0] || null;
      setSelectedTierCode(initialTier?.tierCode || '');
      setSelectedRuleId(initialRule?.ruleId || '');
      setTierDraft(initialTier);
      setRuleDraft(initialRule);
      syncBenefitRows(initialTier);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load loyalty configuration');
    } finally {
      setIsLoading(false);
    }
  };

  /** Sync the benefit editor rows from a tier's benefits record. */
  const syncBenefitRows = (tier: LoyaltyTier | null) => {
    if (!tier?.benefits || Object.keys(tier.benefits).length === 0) {
      setBenefitRows([]);
      return;
    }
    setBenefitRows(Object.entries(tier.benefits).map(([key, value]) => ({ key, value })));
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  useEffect(() => {
    const next = tiers.find((tier) => tier.tierCode === selectedTierCode) || null;
    setTierDraft(next);
    syncBenefitRows(next);
  }, [tiers, selectedTierCode]);

  useEffect(() => {
    setRuleDraft(rules.find((rule) => rule.ruleId === selectedRuleId) || null);
  }, [rules, selectedRuleId]);

  const tierSummary = useMemo(
    () => tiers.map((tier) => `${tier.displayName}: ${tier.minLifetimePoints.toLocaleString()}+`).join(' · '),
    [tiers],
  );

  /** Build a benefits Record from the editor rows (strips empty keys). */
  const buildBenefitsRecord = (): Record<string, string> => {
    const record: Record<string, string> = {};
    for (const row of benefitRows) {
      const k = row.key.trim();
      if (k) {
        record[k] = row.value;
      }
    }
    return record;
  };

  const saveTier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tierDraft) return;
    setIsSavingTier(true);
    setFeedback(null);
    setError(null);
    try {
      const benefitsPayload = buildBenefitsRecord();
      const payload = {
        ...tierDraft,
        benefits: Object.keys(benefitsPayload).length > 0 ? benefitsPayload : undefined,
      };
      const response = await fetch(`/api/v1/admin/loyalty/tiers/${encodeURIComponent(tierDraft.tierCode)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': 'admin',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to save tier settings');
      }
      const data = await response.json();
      const nextTiers = Array.isArray(data?.tiers) ? data.tiers : [];
      setTiers(nextTiers);
      setFeedback('Tier thresholds updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save tier settings');
    } finally {
      setIsSavingTier(false);
    }
  };

  const saveRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ruleDraft) return;
    setIsSavingRule(true);
    setFeedback(null);
    setError(null);
    try {
      const payload = {
        ...ruleDraft,
        effectiveFrom: localToRfc3339(rfc3339ToLocal(ruleDraft.effectiveFrom)) || undefined,
        effectiveTo: localToRfc3339(rfc3339ToLocal(ruleDraft.effectiveTo)) || undefined,
      };
      const response = await fetch(`/api/v1/admin/loyalty/rules/${encodeURIComponent(ruleDraft.ruleId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': 'admin',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to save accrual rule');
      }
      const data = await response.json();
      const nextRules = Array.isArray(data?.rules) ? data.rules : [];
      setRules(nextRules);
      setFeedback('Accrual rule updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save accrual rule');
    } finally {
      setIsSavingRule(false);
    }
  };

  const createRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingRule(true);
    setFeedback(null);
    setError(null);
    try {
      const payload = {
        ...newRuleDraft,
        maxPointsPerEvent: newRuleDraft.maxPointsPerEvent || undefined,
      };
      const response = await fetch('/api/v1/admin/loyalty/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': 'admin',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to create accrual rule');
      }
      const data = await response.json();
      const nextRules = Array.isArray(data?.rules) ? data.rules : [];
      setRules(nextRules);
      const created = nextRules[nextRules.length - 1];
      if (created) {
        setSelectedRuleId(created.ruleId);
      }
      setFeedback('Accrual rule created.');
      setRuleMode('edit');
      setNewRuleDraft({
        name: '',
        sourceType: 'bet_settlement',
        active: true,
        multiplier: 1.0,
        minQualifiedStakeCents: 0,
        maxPointsPerEvent: 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create accrual rule');
    } finally {
      setIsCreatingRule(false);
    }
  };

  // Benefit row helpers
  const addBenefitRow = () => setBenefitRows((rows) => [...rows, { key: '', value: '' }]);
  const removeBenefitRow = (index: number) => setBenefitRows((rows) => rows.filter((_, i) => i !== index));
  const updateBenefitRow = (index: number, field: 'key' | 'value', val: string) => {
    setBenefitRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
  };

  if (isLoading) {
    return (
      <div>
        <h1 style={pageTitleStyle}>Loyalty Settings</h1>
        <LoadingSpinner centered={true} text="Loading loyalty rules and tiers..." />
      </div>
    );
  }

  if (error && !tiers.length && !rules.length) {
    return (
      <ErrorState
        title="Failed to load loyalty settings"
        message={error}
        onRetry={() => void loadConfig()}
        showRetryButton={true}
      />
    );
  }

  const sortedTiers = [...tiers].sort((a, b) => a.rank - b.rank);

  return (
    <div>
      <div style={headerRowStyle}>
        <div>
          <h1 style={pageTitleStyle}>Loyalty Settings</h1>
          <p style={subtitleStyle}>
            Tune tier thresholds and settled-bet accrual rules without leaving the backoffice.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/loyalty" style={{ ...buttonStyle(), textDecoration: 'none' }}>
            Back to Loyalty
          </Link>
          <button style={buttonStyle()} onClick={() => void loadConfig()}>
            Refresh
          </button>
        </div>
      </div>

      <div style={metricsGridStyle}>
        <MetricCard label="Tier Ladder" value={tierSummary || 'No active tiers'} />
        <MetricCard label="Rules" value={rules.length.toLocaleString()} />
        <MetricCard label="Referral Bonus" value={`${referralBonusPoints.toLocaleString()} pts`} />
      </div>

      {/* Tier Ladder Visual */}
      {sortedTiers.length > 0 && (
        <div style={tierLadderContainerStyle}>
          <h3 style={{ ...sectionTitleStyle, fontSize: 14, margin: '0 0 12px 0' }}>Tier Ladder</h3>
          <div style={tierLadderRowStyle}>
            {sortedTiers.map((tier, idx) => (
              <div key={tier.tierCode} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                <div style={tierStepStyle(idx, sortedTiers.length, tier.active)}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tier.active ? '#39ff14' : '#64748b' }}>
                    {tier.displayName}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {tier.minLifetimePoints.toLocaleString()} pts
                  </div>
                  <div style={{ fontSize: 10, marginTop: 4, color: tier.active ? '#4ade80' : '#475569' }}>
                    {tier.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                {idx < sortedTiers.length - 1 && (
                  <div style={tierLadderConnectorStyle} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback ? <div style={successBannerStyle}>{feedback}</div> : null}
      {error ? <div style={errorBannerStyle}>{error}</div> : null}

      <div style={settingsGridStyle}>
        <div style={surfaceCardStyle}>
          <h2 style={sectionTitleStyle}>Tier Management</h2>
          <div style={pillRowStyle}>
            {tiers.map((tier) => (
              <button
                key={tier.tierCode}
                type="button"
                style={pillStyle(selectedTierCode === tier.tierCode)}
                onClick={() => setSelectedTierCode(tier.tierCode)}
              >
                {tier.displayName}
              </button>
            ))}
          </div>

          {tierDraft ? (
            <form style={formStyle} onSubmit={saveTier}>
              <div style={formColumnsStyle}>
                <label style={labelStyle}>
                  Display Name
                  <input
                    style={inputStyle}
                    value={tierDraft.displayName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setTierDraft((current) => current ? { ...current, displayName: event.target.value } : current)
                    }
                  />
                </label>
                <label style={labelStyle}>
                  Rank
                  <input
                    style={inputStyle}
                    type="number"
                    value={tierDraft.rank}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setTierDraft((current) => current ? { ...current, rank: Number(event.target.value) } : current)
                    }
                  />
                </label>
              </div>
              <div style={formColumnsStyle}>
                <label style={labelStyle}>
                  Min Lifetime Points
                  <input
                    style={inputStyle}
                    type="number"
                    value={tierDraft.minLifetimePoints}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setTierDraft((current) => current ? { ...current, minLifetimePoints: Number(event.target.value) } : current)
                    }
                  />
                </label>
                <label style={labelStyle}>
                  Min Rolling 30D Points
                  <input
                    style={inputStyle}
                    type="number"
                    value={tierDraft.minRolling30dPoints || 0}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setTierDraft((current) => current ? { ...current, minRolling30dPoints: Number(event.target.value) } : current)
                    }
                  />
                </label>
              </div>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={tierDraft.active}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setTierDraft((current) => current ? { ...current, active: event.target.checked } : current)
                  }
                />
                Tier is active
              </label>

              {/* Benefits Editor */}
              <div style={benefitsSectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600 }}>Tier Benefits</span>
                  <button type="button" style={smallButtonStyle} onClick={addBenefitRow}>
                    + Add Benefit
                  </button>
                </div>
                {benefitRows.length === 0 ? (
                  <div style={helperTextStyle}>No benefits configured. Click &quot;Add Benefit&quot; to define key-value pairs.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {benefitRows.map((row, idx) => (
                      <div key={idx} style={benefitRowStyle}>
                        <input
                          style={{ ...inputStyle, flex: '1 1 40%' }}
                          value={row.key}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateBenefitRow(idx, 'key', event.target.value)}
                          placeholder="e.g. cashback_rate"
                        />
                        <input
                          style={{ ...inputStyle, flex: '1 1 40%' }}
                          value={row.value}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateBenefitRow(idx, 'value', event.target.value)}
                          placeholder="e.g. 5%"
                        />
                        <button
                          type="button"
                          style={removeBenefitBtnStyle}
                          onClick={() => removeBenefitRow(idx)}
                          title="Remove benefit"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" style={buttonStyle(isSavingTier)} disabled={isSavingTier}>
                {isSavingTier ? 'Saving Tier...' : 'Save Tier'}
              </button>
            </form>
          ) : (
            <div style={helperTextStyle}>No tier selected.</div>
          )}
        </div>

        <div style={surfaceCardStyle}>
          <h2 style={sectionTitleStyle}>Accrual Rules</h2>

          {/* Mode toggle: Edit Existing / Create New */}
          <div style={{ ...pillRowStyle, marginBottom: 12 }}>
            <button
              type="button"
              style={pillStyle(ruleMode === 'edit')}
              onClick={() => setRuleMode('edit')}
            >
              Edit Existing
            </button>
            <button
              type="button"
              style={pillStyle(ruleMode === 'create')}
              onClick={() => setRuleMode('create')}
            >
              + Create Rule
            </button>
          </div>

          {ruleMode === 'edit' ? (
            <>
              <div style={pillRowStyle}>
                {rules.map((rule) => (
                  <button
                    key={rule.ruleId}
                    type="button"
                    style={pillStyle(selectedRuleId === rule.ruleId)}
                    onClick={() => setSelectedRuleId(rule.ruleId)}
                  >
                    <span style={statusDotStyle(rule.active)} />
                    {rule.name}
                  </button>
                ))}
              </div>

              {ruleDraft ? (
                <form style={formStyle} onSubmit={saveRule}>
                  <label style={labelStyle}>
                    Rule Name
                    <input
                      style={inputStyle}
                      value={ruleDraft.name}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setRuleDraft((current) => current ? { ...current, name: event.target.value } : current)
                      }
                    />
                  </label>
                  <div style={formColumnsStyle}>
                    <label style={labelStyle}>
                      Source Type
                      <input
                        style={inputStyle}
                        value={ruleDraft.sourceType}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setRuleDraft((current) => current ? { ...current, sourceType: event.target.value } : current)
                        }
                      />
                    </label>
                    <label style={labelStyle}>
                      Multiplier
                      <input
                        style={inputStyle}
                        type="number"
                        step="0.1"
                        value={ruleDraft.multiplier}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setRuleDraft((current) => current ? { ...current, multiplier: Number(event.target.value) } : current)
                        }
                      />
                    </label>
                  </div>
                  <div style={formColumnsStyle}>
                    <label style={labelStyle}>
                      Min Qualified Stake (cents)
                      <input
                        style={inputStyle}
                        type="number"
                        value={ruleDraft.minQualifiedStakeCents}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setRuleDraft((current) => current ? { ...current, minQualifiedStakeCents: Number(event.target.value) } : current)
                        }
                      />
                    </label>
                    <label style={labelStyle}>
                      Max Points / Event
                      <input
                        style={inputStyle}
                        type="number"
                        value={ruleDraft.maxPointsPerEvent || 0}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setRuleDraft((current) => current ? { ...current, maxPointsPerEvent: Number(event.target.value) } : current)
                        }
                      />
                    </label>
                  </div>

                  {/* Effective Date Range */}
                  <div style={formColumnsStyle}>
                    <label style={labelStyle}>
                      Effective From
                      <input
                        style={inputStyle}
                        type="datetime-local"
                        value={rfc3339ToLocal(ruleDraft.effectiveFrom)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setRuleDraft((current) =>
                            current ? { ...current, effectiveFrom: localToRfc3339(event.target.value) || undefined } : current,
                          )
                        }
                      />
                    </label>
                    <label style={labelStyle}>
                      Effective To
                      <input
                        style={inputStyle}
                        type="datetime-local"
                        value={rfc3339ToLocal(ruleDraft.effectiveTo)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setRuleDraft((current) =>
                            current ? { ...current, effectiveTo: localToRfc3339(event.target.value) || undefined } : current,
                          )
                        }
                      />
                    </label>
                  </div>

                  <label style={checkboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={ruleDraft.active}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setRuleDraft((current) => current ? { ...current, active: event.target.checked } : current)
                      }
                    />
                    Rule is active
                  </label>
                  <div style={helperTextStyle}>
                    This MVP applies the first active settled-bet rule. Use one active default rule at a time until multi-rule evaluation is expanded.
                  </div>
                  <button type="submit" style={buttonStyle(isSavingRule)} disabled={isSavingRule}>
                    {isSavingRule ? 'Saving Rule...' : 'Save Rule'}
                  </button>
                </form>
              ) : (
                <div style={helperTextStyle}>No rule selected.</div>
              )}
            </>
          ) : (
            <form style={formStyle} onSubmit={createRule}>
              <label style={labelStyle}>
                Rule Name
                <input
                  style={inputStyle}
                  value={newRuleDraft.name}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setNewRuleDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="e.g. Double Points Weekend"
                  required
                />
              </label>
              <div style={formColumnsStyle}>
                <label style={labelStyle}>
                  Source Type
                  <input
                    style={inputStyle}
                    value={newRuleDraft.sourceType}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setNewRuleDraft((current) => ({ ...current, sourceType: event.target.value }))
                    }
                  />
                </label>
                <label style={labelStyle}>
                  Multiplier
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newRuleDraft.multiplier}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setNewRuleDraft((current) => ({ ...current, multiplier: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>
              <div style={formColumnsStyle}>
                <label style={labelStyle}>
                  Min Qualified Stake (cents)
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={newRuleDraft.minQualifiedStakeCents}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setNewRuleDraft((current) => ({ ...current, minQualifiedStakeCents: Number(event.target.value) }))
                    }
                  />
                </label>
                <label style={labelStyle}>
                  Max Points / Event (0 = unlimited)
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={newRuleDraft.maxPointsPerEvent || 0}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setNewRuleDraft((current) => ({ ...current, maxPointsPerEvent: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={newRuleDraft.active}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setNewRuleDraft((current) => ({ ...current, active: event.target.checked }))
                  }
                />
                Rule is active
              </label>
              <div style={helperTextStyle}>
                Creates a new accrual rule. You can set effective dates after creation by editing the rule.
              </div>
              <button type="submit" style={buttonStyle(isCreatingRule)} disabled={isCreatingRule}>
                {isCreatingRule ? 'Creating Rule...' : 'Create Rule'}
              </button>
            </form>
          )}
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

/* ── Style constants ── */

const pageTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 8,
  color: '#ffffff',
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: '#a0a0a0',
  fontSize: 14,
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-end',
  marginBottom: 20,
};

const metricsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 20,
};

const settingsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 20,
};

const surfaceCardStyle: CSSProperties = {
  background: '#16213e',
  border: '1px solid #0f3460',
  borderRadius: 12,
  padding: 20,
};

const metricLabelStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const metricValueStyle: CSSProperties = {
  color: '#ffffff',
  fontSize: 24,
  fontWeight: 800,
};

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 16px 0',
  color: '#ffffff',
  fontSize: 18,
  fontWeight: 700,
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const formColumnsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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
  width: '100%',
  background: '#0f172a',
  border: '1px solid #1e3a5f',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#f8fafc',
  fontSize: 14,
};

const checkboxLabelStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  color: '#cbd5e1',
  fontSize: 13,
  fontWeight: 600,
};

const helperTextStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  lineHeight: 1.5,
};

const pillRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 16,
};

function pillStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 999,
    border: `1px solid ${active ? '#4a7eff' : '#1e3a5f'}`,
    background: active ? '#4a7eff' : '#0f172a',
    color: active ? '#0b1020' : '#cbd5e1',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function statusDotStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: active ? '#39ff14' : '#475569',
    flexShrink: 0,
  };
}

function buttonStyle(disabled = false): CSSProperties {
  return {
    padding: '10px 16px',
    backgroundColor: disabled ? '#3b4c7a' : '#4a7eff',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    fontSize: 14,
  };
}

const smallButtonStyle: CSSProperties = {
  padding: '4px 10px',
  backgroundColor: 'transparent',
  color: '#4a7eff',
  border: '1px solid #4a7eff',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 12,
};

const successBannerStyle: CSSProperties = {
  marginBottom: 16,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'rgba(34,197,94,0.14)',
  border: '1px solid rgba(34,197,94,0.24)',
  color: '#dcfce7',
};

const errorBannerStyle: CSSProperties = {
  marginBottom: 16,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'rgba(248,113,113,0.14)',
  border: '1px solid rgba(248,113,113,0.24)',
  color: '#fee2e2',
};

/* Benefits editor styles */

const benefitsSectionStyle: CSSProperties = {
  border: '1px solid #1e3a5f',
  borderRadius: 8,
  padding: 14,
  background: 'rgba(15, 23, 42, 0.5)',
};

const benefitRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

const removeBenefitBtnStyle: CSSProperties = {
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  border: '1px solid #7f1d1d',
  background: 'rgba(127, 29, 29, 0.3)',
  color: '#f87171',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: 700,
  flexShrink: 0,
};

/* Tier Ladder Visual styles */

const tierLadderContainerStyle: CSSProperties = {
  background: '#16213e',
  border: '1px solid #0f3460',
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
};

const tierLadderRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 0,
  overflowX: 'auto',
};

function tierStepStyle(idx: number, total: number, active: boolean): CSSProperties {
  const minH = 48;
  const maxH = 110;
  const h = total > 1 ? minH + ((maxH - minH) * idx) / (total - 1) : maxH;
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    height: h,
    background: active ? 'rgba(74, 126, 255, 0.12)' : 'rgba(15, 23, 42, 0.6)',
    border: `1px solid ${active ? '#4a7eff' : '#1e3a5f'}`,
    borderRadius: 8,
    padding: '8px 12px',
    textAlign: 'center',
  };
}

const tierLadderConnectorStyle: CSSProperties = {
  width: 24,
  height: 2,
  background: '#1e3a5f',
  flexShrink: 0,
  alignSelf: 'center',
};

export default function LoyaltySettingsPage() {
  return (
    <ErrorBoundary>
      <LoyaltySettingsPageContent />
    </ErrorBoundary>
  );
}
