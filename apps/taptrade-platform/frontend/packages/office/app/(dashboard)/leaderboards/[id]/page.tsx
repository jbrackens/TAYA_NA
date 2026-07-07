"use client";

export const dynamic = "force-dynamic";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ErrorBoundary,
  ErrorState,
  LoadingSpinner,
} from "../../../components/shared";
import { adminFetch } from "../../../lib/admin-fetch";

interface LeaderboardDefinition {
  leaderboardId: string;
  slug?: string;
  name: string;
  description?: string;
  metricKey: string;
  pointMetricKey?: string;
  eventType?: string;
  rankingMode: string;
  order: string;
  status: string;
  unit?: string;
  rewardSummary?: string;
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
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

/** Convert a datetime-local value (YYYY-MM-DDTHH:mm) to RFC3339 */
function toRFC3339(dtLocal: string): string {
  if (!dtLocal) return "";
  try {
    const d = new Date(dtLocal);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  } catch {
    return "";
  }
}

function toLaunchMetricKey(value: string): string {
  return value === "net_profit_points" ? "net_points" : value;
}

function toLegacyMetricKey(value: string): string {
  const trimmed = value.trim();
  return trimmed === "net_points" ? "net_profit_points" : trimmed;
}

function normalizePointUnit(value?: string): string {
  const trimmed = value?.trim().toUpperCase();
  return !trimmed || trimmed === "USD" ? "PTS" : trimmed;
}

function LeaderboardDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const leaderboardId = params?.id as string;
  const [definition, setDefinition] = useState<LeaderboardDefinition | null>(
    null,
  );
  const [standings, setStandings] = useState<LeaderboardStanding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    metricKey: "",
    eventType: "",
    rankingMode: "sum",
    order: "desc",
    status: "active",
    unit: "PTS",
    rewardSummary: "",
    windowStartsAt: "",
    windowEndsAt: "",
  });
  const [eventForm, setEventForm] = useState({
    playerId: "",
    score: "0",
    sourceType: "admin_seed",
    sourceId: "",
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
      const response = await adminFetch(
        `/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load leaderboard");
      }
      const data = await response.json();
      const nextDefinition = data?.leaderboard || null;
      setDefinition(nextDefinition);
      setStandings(Array.isArray(data?.items) ? data.items : []);
      if (nextDefinition) {
        setForm({
          slug: nextDefinition.slug || "",
          name: nextDefinition.name || "",
          description: nextDefinition.description || "",
          metricKey: toLaunchMetricKey(
            nextDefinition.pointMetricKey || nextDefinition.metricKey || "",
          ),
          eventType: nextDefinition.eventType || "",
          rankingMode: nextDefinition.rankingMode || "sum",
          order: nextDefinition.order || "desc",
          status: nextDefinition.status || "active",
          unit: normalizePointUnit(nextDefinition.unit),
          rewardSummary: nextDefinition.rewardSummary || "",
          windowStartsAt: toDatetimeLocal(nextDefinition.windowStartsAt),
          windowEndsAt: toDatetimeLocal(nextDefinition.windowEndsAt),
        });
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [leaderboardId]);

  const buildSavePayload = (statusOverride?: string) => ({
    ...form,
    metricKey: toLegacyMetricKey(form.metricKey),
    unit: normalizePointUnit(form.unit),
    rewardSummary: form.rewardSummary.trim(),
    status: statusOverride || form.status,
    windowStartsAt: toRFC3339(form.windowStartsAt) || undefined,
    windowEndsAt: toRFC3339(form.windowEndsAt) || undefined,
    createdBy: "office-admin",
  });

  const saveDefinition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsSaving(true);
    try {
      const response = await adminFetch(
        `/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildSavePayload()),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to save leaderboard");
      }
      const updated = await response.json();
      setDefinition(updated);
      showFeedback("Leaderboard settings saved.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to save leaderboard",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const setStatusAndSave = async (targetStatus: string) => {
    setError(null);
    setFeedback(null);
    setIsSaving(true);
    try {
      const response = await adminFetch(
        `/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildSavePayload(targetStatus)),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to set status to ${targetStatus}`);
      }
      const updated = await response.json();
      setDefinition(updated);
      setForm((current) => ({ ...current, status: targetStatus }));
      showFeedback(`Status changed to ${targetStatus.toUpperCase()}.`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to set status to ${targetStatus}`,
      );
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
      setError("Player and numeric score are required.");
      return;
    }
    setIsRecording(true);
    try {
      const response = await adminFetch(
        `/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}/entries`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playerId: eventForm.playerId.trim(),
            score: parsedScore,
            sourceType: eventForm.sourceType.trim(),
            sourceId: eventForm.sourceId.trim(),
            idempotencyKey: `office-leaderboard:${leaderboardId}:${eventForm.playerId.trim()}:${Date.now()}`,
          }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to record leaderboard event");
      }
      showFeedback(
        "Score event recorded. Recompute the board to refresh standings.",
      );
      setEventForm({
        playerId: "",
        score: "0",
        sourceType: "admin_seed",
        sourceId: "",
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to record leaderboard event",
      );
    } finally {
      setIsRecording(false);
    }
  };

  const recompute = async () => {
    setIsRecomputing(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await adminFetch(
        `/api/v1/admin/leaderboards/${encodeURIComponent(leaderboardId)}/recompute`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to recompute leaderboard");
      }
      const data = await response.json();
      setDefinition(data?.leaderboard || definition);
      setStandings(Array.isArray(data?.items) ? data.items : []);
      showFeedback("Leaderboard recomputed successfully.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to recompute leaderboard",
      );
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
        <h1 className={pageTitleClassName}>Loading leaderboard...</h1>
        <LoadingSpinner centered={true} text="Loading leaderboard detail..." />
      </div>
    );
  }

  if (error && !definition) {
    return (
      <ErrorState
        title="Failed to load leaderboard"
        message={error}
        onRetry={() => void loadDetail()}
        showRetryButton={true}
      />
    );
  }

  if (!definition) {
    return (
      <ErrorState
        title="Leaderboard not found"
        message="The requested leaderboard could not be located."
        onRetry={() => router.push("/leaderboards")}
        showRetryButton={true}
      />
    );
  }

  return (
    <div>
      <div className={headerBarClassName}>
        <div>
          <h1 className={pageTitleClassName}>{definition.name}</h1>
          <p className={subtitleClassName}>
            {definition.metricKey} · {definition.rankingMode.toUpperCase()} ·{" "}
            {definition.order.toUpperCase()} · {definition.status.toUpperCase()}
          </p>
        </div>
        <div className={actionsRowClassName}>
          <button
            className={buttonClassName(true)}
            onClick={() => router.push("/leaderboards")}
          >
            Back
          </button>
          <button
            className={buttonClassName(isRecomputing)}
            onClick={() => void recompute()}
            disabled={isRecomputing}
          >
            {isRecomputing ? "Recomputing..." : "Recompute"}
          </button>
        </div>
      </div>

      <div className={metricsGridClassName}>
        <MetricCard label="Status" value={definition.status.toUpperCase()} />
        <MetricCard
          label="Entries Ranked"
          value={standings.length.toLocaleString()}
        />
        <MetricCard
          label="Ranking Mode"
          value={definition.rankingMode.toUpperCase()}
        />
        <MetricCard
          label="Last Recompute"
          value={
            definition.lastComputedAt
              ? new Date(definition.lastComputedAt).toLocaleString()
              : "Never"
          }
        />
      </div>

      {feedback ? (
        <div className={successBannerClassName}>{feedback}</div>
      ) : null}
      {error ? <div className={errorBannerClassName}>{error}</div> : null}

      <div className={detailGridClassName}>
        <div className={surfaceCardClassName}>
          <h2 className={sectionTitleClassName}>Definition</h2>

          {/* Lifecycle buttons */}
          <div className={lifecycleRowClassName}>
            <button
              className={lifecyclePillClassName(
                form.status === "draft",
                isSaving,
              )}
              disabled={form.status === "draft" || isSaving}
              onClick={() => void setStatusAndSave("draft")}
            >
              Set Draft
            </button>
            <button
              className={lifecyclePillClassName(
                form.status === "active",
                isSaving,
              )}
              disabled={form.status === "active" || isSaving}
              onClick={() => void setStatusAndSave("active")}
            >
              Activate
            </button>
            <button
              className={lifecyclePillClassName(
                form.status === "closed",
                isSaving,
                true,
              )}
              disabled={form.status === "closed" || isSaving}
              onClick={() => void setStatusAndSave("closed")}
            >
              Close Board
            </button>
          </div>

          <form className={formClassName} onSubmit={saveDefinition}>
            <div className={formColumnsClassName}>
              <label className={labelClassName}>
                Name
                <input
                  className={inputClassName}
                  value={form.name}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClassName}>
                Slug
                <input
                  className={inputClassName}
                  value={form.slug}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className={labelClassName}>
              Description
              <textarea
                className={textAreaClassName}
                value={form.description}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <div className={formColumnsClassName}>
              <label className={labelClassName}>
                Metric Key
                <input
                  className={inputClassName}
                  value={form.metricKey}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      metricKey: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClassName}>
                Event Type
                <input
                  className={inputClassName}
                  value={form.eventType}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      eventType: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className={formColumnsClassName}>
              <label className={labelClassName}>
                Mode
                <select
                  className={selectClassName}
                  value={form.rankingMode}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setForm((current) => ({
                      ...current,
                      rankingMode: event.target.value,
                    }))
                  }
                >
                  <option value="sum">SUM</option>
                  <option value="min">MIN</option>
                  <option value="max">MAX</option>
                </select>
              </label>
              <label className={labelClassName}>
                Order
                <select
                  className={selectClassName}
                  value={form.order}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setForm((current) => ({
                      ...current,
                      order: event.target.value,
                    }))
                  }
                >
                  <option value="desc">DESC</option>
                  <option value="asc">ASC</option>
                </select>
              </label>
              <label className={labelClassName}>
                Status
                <select
                  className={selectClassName}
                  value={form.status}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
            <div className={formColumnsClassName}>
              <label className={labelClassName}>
                Window Start
                <input
                  type="datetime-local"
                  className={inputClassName}
                  value={form.windowStartsAt}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      windowStartsAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClassName}>
                Window End
                <input
                  type="datetime-local"
                  className={inputClassName}
                  value={form.windowEndsAt}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      windowEndsAt: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className={formColumnsClassName}>
              <label className={labelClassName}>
                Unit
                <input
                  className={inputClassName}
                  value={form.unit}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      unit: normalizePointUnit(event.target.value),
                    }))
                  }
                />
              </label>
              <label className={labelClassName}>
                Reward Summary
                <input
                  className={inputClassName}
                  value={form.rewardSummary}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      rewardSummary: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <button
              type="submit"
              className={buttonClassName(isSaving)}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Definition"}
            </button>
          </form>
        </div>

        <div className={surfaceCardClassName}>
          <h2 className={sectionTitleClassName}>Record Score Event</h2>
          <form className={formClassName} onSubmit={recordEvent}>
            <label className={labelClassName}>
              Player ID
              <input
                className={inputClassName}
                value={eventForm.playerId}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEventForm((current) => ({
                    ...current,
                    playerId: event.target.value,
                  }))
                }
              />
            </label>
            <label className={labelClassName}>
              Score
              <input
                className={inputClassName}
                value={eventForm.score}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEventForm((current) => ({
                    ...current,
                    score: event.target.value,
                  }))
                }
              />
            </label>
            <label className={labelClassName}>
              Source Type
              <input
                className={inputClassName}
                value={eventForm.sourceType}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEventForm((current) => ({
                    ...current,
                    sourceType: event.target.value,
                  }))
                }
              />
            </label>
            <label className={labelClassName}>
              Source ID
              <input
                className={inputClassName}
                value={eventForm.sourceId}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEventForm((current) => ({
                    ...current,
                    sourceId: event.target.value,
                  }))
                }
                placeholder="optional"
              />
            </label>
            <button
              type="submit"
              className={buttonClassName(isRecording)}
              disabled={isRecording}
            >
              {isRecording ? "Recording..." : "Record Event"}
            </button>
          </form>
        </div>
      </div>

      <div className={surfaceCardClassName}>
        <div className={standingsHeaderClassName}>
          <h2 className={standingsTitleClassName}>Standings</h2>
          {standingsMeta ? (
            <div className={standingsMetaClassName}>
              {standingsMeta.total} entries &middot; Top:{" "}
              {standingsMeta.top.toLocaleString()} &middot; Range:{" "}
              {standingsMeta.bottom.toLocaleString()} &ndash;{" "}
              {standingsMeta.top.toLocaleString()}
            </div>
          ) : null}
        </div>
        {standings.length ? (
          <div className={standingsListClassName}>
            {standings.map((standing) => (
              <div key={standing.playerId} className={standingRowClassName}>
                <div className={rankCellClassName}>#{standing.rank}</div>
                <div className="flex-1">
                  <div className={standingTitleClassName}>
                    {standing.playerId}
                  </div>
                  <div className={standingMetaTextClassName}>
                    {standing.eventCount} events
                    {standing.lastEventAt
                      ? ` · last event ${new Date(standing.lastEventAt).toLocaleString()}`
                      : ""}
                  </div>
                </div>
                <div className={scoreCellClassName}>
                  {standing.score.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={emptyTextClassName}>
            No standings yet. Record events, then recompute the leaderboard.
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={metricCardClassName}>
      <div className={metricLabelClassName}>{label}</div>
      <div className={metricValueClassName}>{value}</div>
    </div>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function buttonClassName(disabled = false) {
  return cx(
    "rounded border-0 px-4 py-2 text-sm font-semibold text-[var(--bg-deep,#f7f3ed)]",
    disabled
      ? "cursor-not-allowed bg-[#3b4c7a]"
      : "cursor-pointer bg-[var(--focus-ring,#0e7a53)]",
  );
}

function lifecyclePillClassName(
  active: boolean,
  saving: boolean,
  danger = false,
) {
  const isDisabled = active || saving;

  return cx(
    "rounded-[20px] border-2 px-[14px] py-1.5 text-xs font-bold uppercase tracking-[0.05em]",
    active &&
      danger &&
      "border-[#dc2626] bg-[#7f1d1d] text-[var(--t1,#1a1a1a)]",
    active &&
      !danger &&
      "border-[var(--focus-ring,#0e7a53)] bg-[#1e3a5f] text-[var(--t1,#1a1a1a)]",
    !active && "border-[#263056] bg-transparent text-[var(--t3,#8b8378)]",
    isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer opacity-100",
  );
}

const pageTitleClassName =
  "mb-2 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const subtitleClassName = "m-0 text-sm text-[var(--t2,#4a4a4a)]";
const headerBarClassName = "mb-5 flex items-end justify-between gap-4";
const actionsRowClassName = "flex flex-wrap gap-3";
const metricsGridClassName =
  "mb-5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4";
const metricCardClassName =
  "rounded-[12px] border border-[#1e2243] bg-[#111328] p-[18px]";
const metricLabelClassName =
  "mb-2 text-xs uppercase tracking-[0.08em] text-[var(--t3,#8b8378)]";
const metricValueClassName = "text-[22px] font-bold text-[var(--t1,#1a1a1a)]";
const successBannerClassName =
  "mb-4 rounded-[10px] border border-[#14532d] bg-[#052e24] px-[14px] py-3 font-semibold text-[#86efac]";
const errorBannerClassName =
  "mb-4 rounded-[10px] border border-[#7f1d1d] bg-[#3a1014] px-[14px] py-3 font-semibold text-[#fca5a5]";
const detailGridClassName =
  "mb-5 grid grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-5";
const surfaceCardClassName =
  "rounded-[12px] border border-[#1e2243] bg-[#111328] p-5";
const sectionTitleClassName =
  "mb-4 mt-0 text-lg font-bold text-[var(--t1,#1a1a1a)]";
const lifecycleRowClassName = "mb-4 flex flex-wrap gap-2.5";
const formClassName = "flex flex-col gap-[14px]";
const formColumnsClassName =
  "grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3";
const labelClassName =
  "flex flex-col gap-1.5 text-[13px] font-semibold text-[#cbd5e1]";
const inputClassName =
  "rounded-lg border border-[#263056] bg-[#0b1021] px-3 py-2.5 text-sm text-[var(--t1,#1a1a1a)]";
const selectClassName = `${inputClassName} appearance-none`;
const textAreaClassName = `${inputClassName} min-h-[84px] resize-y`;
const standingsHeaderClassName =
  "mb-4 flex flex-wrap items-center justify-between gap-2";
const standingsTitleClassName =
  "m-0 text-lg font-bold text-[var(--t1,#1a1a1a)]";
const standingsMetaClassName = "text-[13px] font-semibold text-[#93c5fd]";
const standingsListClassName = "flex flex-col gap-3";
const standingRowClassName =
  "flex items-center gap-4 rounded-[10px] border border-[#1e2243] bg-[#0b1021] px-4 py-[14px]";
const rankCellClassName =
  "w-[52px] text-center text-[22px] font-bold text-[#93c5fd]";
const standingTitleClassName = "text-[15px] font-bold text-[var(--t1,#1a1a1a)]";
const standingMetaTextClassName = "mt-1 text-xs text-[var(--t3,#8b8378)]";
const scoreCellClassName = "text-xl font-bold text-[var(--t1,#1a1a1a)]";
const emptyTextClassName = "text-sm text-[var(--t3,#8b8378)]";

export default function LeaderboardDetailPage() {
  return (
    <ErrorBoundary>
      <LeaderboardDetailPageContent />
    </ErrorBoundary>
  );
}
