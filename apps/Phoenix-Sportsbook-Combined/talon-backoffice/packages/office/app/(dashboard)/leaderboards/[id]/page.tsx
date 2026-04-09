'use client';

export const dynamic = 'force-dynamic';

import { ChangeEvent, CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ErrorBoundary, ErrorState, LoadingSpinner } from '../../../components/shared';

interface LeaderboardDefinition {
  leaderboardId: string;
  slug?: string;
  name: string;
  description?: string;
  metricKey: string;
  eventType?: string;
  rankingMode: string;
  order: string;
  status: string;
  currency?: string;
  prizeSummary?: string;
  windowStartsAt?: string;
  windowEndsAt?: string;
  lastComputedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface LeaderboardStanding {
  leaderboardId: string;
  playerId: string;
  rank: number;
  score: number;
  eventCount: number;
  lastEventAt?: string;
}

/** Convert an ISO/RFC3339 string to datetime-local input value (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

/** Convert a datetime-local value (YYYY-MM-DDTHH:mm) to RFC3339 */
function toRFC3339(dtLocal: string): string {
  if (!dtLocal) return '';
  try {
    const d = new Date(dtLocal);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch {
    return '';
  }
}

function LeaderboardDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const leaderboardId = params?.id as string;
  const [definition, setDefinition] = useState<LeaderboardDefinition | null>(null);
  const [standings, setStandings] = useState<LeaderboardStanding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    metricKey: '',
    eventType: '',
    rankingMode: 'sum',
    order: 'desc',
    status: 'active',
    currency: 'USD',
    prizeSummary: '',
    windowStartsAt: '',
    windowEndsAt: '',
  });
  const [eventForm, setEventForm] = useState({
    playerId: '',
    score: '0',
    sourceType: 'admin_seed',
    sourceId: '',
  });

  const showFeedback = useCallback((message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    const ts = new Date().toLocaleTimeString();
    setFeedback(`${message} (${ts})`);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const loadDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}`, {
        headers: { 'X-Admin-Role': 'admin' },
      });
      if (!response.ok) {
        throw new Error('Failed to load leaderboard');
      }
      const data = await response.json();
      const nextDefinition = data?.leaderboard || null;
      setDefinition(nextDefinition);
      setStandings(Array.isArray(data?.items) ? data.items : []);
      if (nextDefinition) {
        setForm({
          slug: nextDefinition.slug || '',
          name: nextDefinition.name || '',
          description: nextDefinition.description || '',
          metricKey: nextDefinition.metricKey || '',
          eventType: nextDefinition.eventType || '',
          rankingMode: nextDefinition.rankingMode || 'sum',
          order: nextDefinition.order || 'desc',
          status: nextDefinition.status || 'active',
          currency: nextDefinition.currency || 'USD',
          prizeSummary: nextDefinition.prizeSummary || '',
          windowStartsAt: toDatetimeLocal(nextDefinition.windowStartsAt),
          windowEndsAt: toDatetimeLocal(nextDefinition.windowEndsAt),
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [leaderboardId]);

  const buildSavePayload = (statusOverride?: string) => ({
    ...form,
    status: statusOverride || form.status,
    windowStartsAt: toRFC3339(form.windowStartsAt) || undefined,
    windowEndsAt: toRFC3339(form.windowEndsAt) || undefined,
    createdBy: 'office-admin',
  });

  const saveDefinition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': 'admin',
        },
        body: JSON.stringify(buildSavePayload()),
      });
      if (!response.ok) {
        throw new Error('Failed to save leaderboard');
      }
      const updated = await response.json();
      setDefinition(updated);
      showFeedback('Leaderboard settings saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save leaderboard');
    } finally {
      setIsSaving(false);
    }
  };

  const setStatusAndSave = async (targetStatus: string) => {
    setError(null);
    setFeedback(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': 'admin',
        },
        body: JSON.stringify(buildSavePayload(targetStatus)),
      });
      if (!response.ok) {
        throw new Error(`Failed to set status to ${targetStatus}`);
      }
      const updated = await response.json();
      setDefinition(updated);
      setForm((current) => ({ ...current, status: targetStatus }));
      showFeedback(`Status changed to ${targetStatus.toUpperCase()}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to set status to ${targetStatus}`);
    } finally {
      setIsSaving(false);
    }
  };

  const recordEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    const parsedScore = Number(eventForm.score);
    if (!eventForm.playerId.trim() || !Number.isFinite(parsedScore)) {
      setError('Player and numeric score are required.');
      return;
    }
    setIsRecording(true);
    try {
      const response = await fetch(`/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': 'admin',
        },
        body: JSON.stringify({
          playerId: eventForm.playerId.trim(),
          score: parsedScore,
          sourceType: eventForm.sourceType.trim(),
          sourceId: eventForm.sourceId.trim(),
          idempotencyKey: `office-leaderboard:${leaderboardId}:${eventForm.playerId.trim()}:${Date.now()}`,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to record leaderboard event');
      }
      showFeedback('Score event recorded. Recompute the board to refresh standings.');
      setEventForm({ playerId: '', score: '0', sourceType: 'admin_seed', sourceId: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record leaderboard event');
    } finally {
      setIsRecording(false);
    }
  };

  const recompute = async () => {
    setIsRecomputing(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await fetch(`/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}/recompute`, {
        method: 'POST',
        headers: { 'X-Admin-Role': 'admin' },
      });
      if (!response.ok) {
        throw new Error('Failed to recompute leaderboard');
      }
      const data = await response.json();
      setDefinition(data?.leaderboard || definition);
      setStandings(Array.isArray(data?.items) ? data.items : []);
      showFeedback('Leaderboard recomputed successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to recompute leaderboard');
    } finally {
      setIsRecomputing(false);
    }
  };

  const standingsMeta = (() => {
    if (!standings.length) return null;
    const scores = standings.map((s) => s.score);
    const top = Math.max(...scores);
    const bottom = Math.min(...scores);
    return { total: standings.length, top, bottom };
  })();

  if (isLoading) {
    return (
      <div>
        <h1 style={pageTitleStyle}>Loading leaderboard...</h1>
        <LoadingSpinner centered={true} text="Loading leaderboard detail..." />
      </div>
    );
  }

  if (error && !definition) {
    return <ErrorState title="Failed to load leaderboard" message={error} onRetry={() => void loadDetail()} showRetryButton={true} />;
  }

  if (!definition) {
    return <ErrorState title="Leaderboard not found" message="The requested leaderboard could not be located." onRetry={() => router.push('/leaderboards')} showRetryButton={true} />;
  }

  return (
    <div>
      <div style={headerBarStyle}>
        <div>
          <h1 style={pageTitleStyle}>{definition.name}</h1>
          <p style={subtitleStyle}>
            {definition.metricKey} · {definition.rankingMode.toUpperCase()} · {definition.order.toUpperCase()} · {definition.status.toUpperCase()}
          </p>
        </div>
        <div style={actionsRowStyle}>
          <button style={buttonStyle(true)} onClick={() => router.push('/leaderboards')}>Back</button>
          <button style={buttonStyle(isRecomputing)} onClick={() => void recompute()} disabled={isRecomputing}>
            {isRecomputing ? 'Recomputing...' : 'Recompute'}
          </button>
        </div>
      </div>

      <div style={metricsGridStyle}>
        <MetricCard label="Status" value={definition.status.toUpperCase()} />
        <MetricCard label="Entries Ranked" value={standings.length.toLocaleString()} />
        <MetricCard label="Ranking Mode" value={definition.rankingMode.toUpperCase()} />
        <MetricCard label="Last Recompute" value={definition.lastComputedAt ? new Date(definition.lastComputedAt).toLocaleString() : 'Never'} />
      </div>

      {feedback ? <div style={successBannerStyle}>{feedback}</div> : null}
      {error ? <div style={errorBannerStyle}>{error}</div> : null}

      <div style={detailGridStyle}>
        <div style={surfaceCardStyle}>
          <h2 style={sectionTitleStyle}>Definition</h2>

          {/* Lifecycle buttons */}
          <div style={lifecycleRowStyle}>
            <button
              style={lifecyclePillStyle(form.status === 'draft', isSaving)}
              disabled={form.status === 'draft' || isSaving}
              onClick={() => void setStatusAndSave('draft')}
            >
              Set Draft
            </button>
            <button
              style={lifecyclePillStyle(form.status === 'active', isSaving)}
              disabled={form.status === 'active' || isSaving}
              onClick={() => void setStatusAndSave('active')}
            >
              Activate
            </button>
            <button
              style={lifecyclePillStyle(form.status === 'closed', isSaving, true)}
              disabled={form.status === 'closed' || isSaving}
              onClick={() => void setStatusAndSave('closed')}
            >
              Close Board
            </button>
          </div>

          <form style={formStyle} onSubmit={saveDefinition}>
            <div style={formColumnsStyle}>
              <label style={labelStyle}>Name<input style={inputStyle} value={form.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label style={labelStyle}>Slug<input style={inputStyle} value={form.slug} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, slug: event.target.value }))} /></label>
            </div>
            <label style={labelStyle}>Description<textarea style={textAreaStyle} value={form.description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <div style={formColumnsStyle}>
              <label style={labelStyle}>Metric Key<input style={inputStyle} value={form.metricKey} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, metricKey: event.target.value }))} /></label>
              <label style={labelStyle}>Event Type<input style={inputStyle} value={form.eventType} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, eventType: event.target.value }))} /></label>
            </div>
            <div style={formColumnsStyle}>
              <label style={labelStyle}>Mode<select style={selectStyle} value={form.rankingMode} onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, rankingMode: event.target.value }))}><option value="sum">SUM</option><option value="min">MIN</option><option value="max">MAX</option></select></label>
              <label style={labelStyle}>Order<select style={selectStyle} value={form.order} onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, order: event.target.value }))}><option value="desc">DESC</option><option value="asc">ASC</option></select></label>
              <label style={labelStyle}>Status<select style={selectStyle} value={form.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option></select></label>
            </div>
            <div style={formColumnsStyle}>
              <label style={labelStyle}>Window Start<input type="datetime-local" style={inputStyle} value={form.windowStartsAt} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, windowStartsAt: event.target.value }))} /></label>
              <label style={labelStyle}>Window End<input type="datetime-local" style={inputStyle} value={form.windowEndsAt} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, windowEndsAt: event.target.value }))} /></label>
            </div>
            <div style={formColumnsStyle}>
              <label style={labelStyle}>Currency<input style={inputStyle} value={form.currency} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, currency: event.target.value }))} /></label>
              <label style={labelStyle}>Prize Summary<input style={inputStyle} value={form.prizeSummary} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, prizeSummary: event.target.value }))} /></label>
            </div>
            <button type="submit" style={buttonStyle(isSaving)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Definition'}</button>
          </form>
        </div>

        <div style={surfaceCardStyle}>
          <h2 style={sectionTitleStyle}>Record Score Event</h2>
          <form style={formStyle} onSubmit={recordEvent}>
            <label style={labelStyle}>Player ID<input style={inputStyle} value={eventForm.playerId} onChange={(event: ChangeEvent<HTMLInputElement>) => setEventForm((current) => ({ ...current, playerId: event.target.value }))} /></label>
            <label style={labelStyle}>Score<input style={inputStyle} value={eventForm.score} onChange={(event: ChangeEvent<HTMLInputElement>) => setEventForm((current) => ({ ...current, score: event.target.value }))} /></label>
            <label style={labelStyle}>Source Type<input style={inputStyle} value={eventForm.sourceType} onChange={(event: ChangeEvent<HTMLInputElement>) => setEventForm((current) => ({ ...current, sourceType: event.target.value }))} /></label>
            <label style={labelStyle}>Source ID<input style={inputStyle} value={eventForm.sourceId} onChange={(event: ChangeEvent<HTMLInputElement>) => setEventForm((current) => ({ ...current, sourceId: event.target.value }))} placeholder="optional" /></label>
            <button type="submit" style={buttonStyle(isRecording)} disabled={isRecording}>{isRecording ? 'Recording...' : 'Record Event'}</button>
          </form>
        </div>
      </div>

      <div style={surfaceCardStyle}>
        <div style={standingsHeaderStyle}>
          <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Standings</h2>
          {standingsMeta ? (
            <div style={standingsMetaStyle}>
              {standingsMeta.total} entries &middot; Top: {standingsMeta.top.toLocaleString()} &middot; Range: {standingsMeta.bottom.toLocaleString()} &ndash; {standingsMeta.top.toLocaleString()}
            </div>
          ) : null}
        </div>
        {standings.length ? (
          <div style={standingsListStyle}>
            {standings.map((standing) => (
              <div key={standing.playerId} style={standingRowStyle}>
                <div style={rankCellStyle}>#{standing.rank}</div>
                <div style={{ flex: 1 }}>
                  <div style={standingTitleStyle}>{standing.playerId}</div>
                  <div style={standingMetaTextStyle}>
                    {standing.eventCount} events
                    {standing.lastEventAt ? ` · last event ${new Date(standing.lastEventAt).toLocaleString()}` : ''}
                  </div>
                </div>
                <div style={scoreCellStyle}>{standing.score.toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={emptyTextStyle}>No standings yet. Record events, then recompute the leaderboard.</div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCardStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
    </div>
  );
}

function buttonStyle(disabled = false): CSSProperties {
  return {
    padding: '8px 16px',
    backgroundColor: disabled ? '#3b4c7a' : '#4a7eff',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: 14,
  };
}

function lifecyclePillStyle(active: boolean, saving: boolean, danger = false): CSSProperties {
  const baseColor = danger ? '#dc2626' : '#4a7eff';
  const isDisabled = active || saving;
  return {
    padding: '6px 14px',
    borderRadius: 20,
    border: active ? `2px solid ${baseColor}` : '2px solid #263056',
    backgroundColor: active ? (danger ? '#7f1d1d' : '#1e3a5f') : 'transparent',
    color: active ? '#ffffff' : '#94a3b8',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    opacity: isDisabled ? 0.7 : 1,
  };
}

const pageTitleStyle: CSSProperties = { fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#ffffff' };
const subtitleStyle: CSSProperties = { margin: 0, color: '#a0a0a0', fontSize: 14 };
const headerBarStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 20 };
const actionsRowStyle: CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap' };
const metricsGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 };
const metricCardStyle: CSSProperties = { background: '#111328', border: '1px solid #1e2243', borderRadius: 12, padding: 18 };
const metricLabelStyle: CSSProperties = { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 };
const metricValueStyle: CSSProperties = { color: '#ffffff', fontSize: 22, fontWeight: 700 };
const successBannerStyle: CSSProperties = { background: '#052e24', border: '1px solid #14532d', color: '#86efac', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontWeight: 600 };
const errorBannerStyle: CSSProperties = { background: '#3a1014', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontWeight: 600 };
const detailGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 20, marginBottom: 20 };
const surfaceCardStyle: CSSProperties = { background: '#111328', border: '1px solid #1e2243', borderRadius: 12, padding: 20 };
const sectionTitleStyle: CSSProperties = { fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 0, marginBottom: 16 };
const lifecycleRowStyle: CSSProperties = { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' };
const formStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 };
const formColumnsStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 };
const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, color: '#cbd5e1', fontSize: 13, fontWeight: 600 };
const inputStyle: CSSProperties = { background: '#0b1021', border: '1px solid #263056', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 14 };
const selectStyle: CSSProperties = { ...inputStyle, appearance: 'none' };
const textAreaStyle: CSSProperties = { ...inputStyle, minHeight: 84, resize: 'vertical' };
const standingsHeaderStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 };
const standingsMetaStyle: CSSProperties = { color: '#93c5fd', fontSize: 13, fontWeight: 600 };
const standingsListStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const standingRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 10, background: '#0b1021', border: '1px solid #1e2243' };
const rankCellStyle: CSSProperties = { width: 52, textAlign: 'center', color: '#93c5fd', fontSize: 22, fontWeight: 700 };
const standingTitleStyle: CSSProperties = { color: '#ffffff', fontSize: 15, fontWeight: 700 };
const standingMetaTextStyle: CSSProperties = { color: '#94a3b8', fontSize: 12, marginTop: 4 };
const scoreCellStyle: CSSProperties = { color: '#f8fafc', fontSize: 20, fontWeight: 700 };
const emptyTextStyle: CSSProperties = { color: '#94a3b8', fontSize: 14 };

export default function LeaderboardDetailPage() {
  return (
    <ErrorBoundary>
      <LeaderboardDetailPageContent />
    </ErrorBoundary>
  );
}
