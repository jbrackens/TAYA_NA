export type FeedThresholds = {
  maxLagMs: number;
  maxGapCount: number;
  maxDuplicateCount: number;
};

export type FeedSummary = {
  streamCount: number;
  unhealthyStreams: number;
  totalApplied: number;
  totalErrors: number;
  maxLagMs: number;
};

export type CancelMetrics = {
  totalAttempts: number;
  totalRetries: number;
  totalFallback: number;
  totalSuccess: number;
  totalFailed: number;
};

export type FeedStreamStatus = {
  adapter: string;
  stream: string;
  state: string;
  applied: number;
  skipped: number;
  replayCount: number;
  duplicateCount: number;
  gapCount: number;
  errorCount: number;
  lastLagMs: number;
  lastRevision: number;
  lastSequence: number;
  lastBetId?: string;
  lastPlayerId?: string;
  lastRequestId?: string;
  lastEventAt: string;
  lastError: string;
  updatedAt: string;
};

export type FeedHealthResponse = {
  enabled?: boolean;
  thresholds?: Partial<FeedThresholds>;
  summary?: Partial<FeedSummary>;
  cancel?: Partial<CancelMetrics>;
  streams?: Partial<FeedStreamStatus>[];
};

export type ProviderCancelForm = {
  adapter: string;
  playerId: string;
  betId: string;
  requestId: string;
  reason: string;
};

export type ProviderCancelRequest = {
  adapter: string;
  playerId: string;
  betId: string;
  requestId: string;
  reason: string;
};

export type ProviderCancelResponse = {
  state?: string;
  adapter?: string;
  attempts?: number;
  retryCount?: number;
  fallbackUsed?: boolean;
  lastError?: string;
  updatedAt?: string;
};

export type BetLifecycleAction = "settle" | "cancel" | "refund";

export type BetInterventionForm = {
  betId: string;
  action: BetLifecycleAction;
  reason: string;
  winningSelectionId: string;
  winningSelectionName: string;
  resultSource: string;
};

export type BetInterventionRequest = {
  reason: string;
  winningSelectionId?: string;
  winningSelectionName?: string;
  resultSource?: string;
};

export type ProviderOpsViewState = {
  enabled: boolean;
  thresholds: FeedThresholds;
  summary: FeedSummary;
  cancel: CancelMetrics;
  streams: FeedStreamStatus[];
};

export type StreamBreaches = {
  lag: boolean;
  gap: boolean;
  duplicate: boolean;
  error: boolean;
};

export type StreamRiskSummary = {
  lag: number;
  gap: number;
  duplicate: number;
  error: number;
  unhealthy: number;
  healthy: number;
};

export type StreamAcknowledgement = {
  streamKey: string;
  adapter: string;
  stream: string;
  operator: string;
  note: string;
  status: string;
  lastAction: string;
  acknowledgedAt: string;
};

export type ProviderStreamAcknowledgement = {
  streamKey: string;
  adapter: string;
  stream: string;
  operator: string;
  note: string;
  status: string;
  lastAction: string;
  acknowledgedAt: string;
  updatedBy: string;
};

export type ProviderStreamAcknowledgementsResponse = {
  items?: Partial<ProviderStreamAcknowledgement>[];
};

export type ProviderStreamAcknowledgementRequest = {
  streamKey?: string;
  adapter?: string;
  stream?: string;
  action?: ProviderAcknowledgementAction;
  operator: string;
  note: string;
};

export type ProviderAcknowledgementAction =
  | "acknowledge"
  | "reassign"
  | "resolve"
  | "reopen";

export type AcknowledgementStaleness = "fresh" | "warning" | "critical";

export type ProviderAcknowledgementSLASetting = {
  adapter: string;
  warningMinutes: number;
  criticalMinutes: number;
  updatedAt: string;
  updatedBy: string;
  source: "default" | "override";
};

export type ProviderAcknowledgementSLASettingsResponse = {
  default?: Partial<ProviderAcknowledgementSLASetting>;
  overrides?: Partial<ProviderAcknowledgementSLASetting>[];
  effective?: Partial<ProviderAcknowledgementSLASetting>[];
};

export type ProviderAcknowledgementSLAState = {
  defaultSetting: ProviderAcknowledgementSLASetting;
  overrides: ProviderAcknowledgementSLASetting[];
  effectiveByAdapter: Record<string, ProviderAcknowledgementSLASetting>;
};

export type ProviderAcknowledgementSLAUpdateRequest = {
  adapter?: string;
  warningMinutes: number;
  criticalMinutes: number;
};

const ACKNOWLEDGEMENT_WARNING_MINUTES = 15;
const ACKNOWLEDGEMENT_CRITICAL_MINUTES = 30;

const DEFAULT_THRESHOLDS: FeedThresholds = {
  maxLagMs: 30000,
  maxGapCount: 0,
  maxDuplicateCount: 50,
};

const DEFAULT_SUMMARY: FeedSummary = {
  streamCount: 0,
  unhealthyStreams: 0,
  totalApplied: 0,
  totalErrors: 0,
  maxLagMs: 0,
};

const DEFAULT_CANCEL_METRICS: CancelMetrics = {
  totalAttempts: 0,
  totalRetries: 0,
  totalFallback: 0,
  totalSuccess: 0,
  totalFailed: 0,
};

const DEFAULT_FORM: ProviderCancelForm = {
  adapter: "",
  playerId: "",
  betId: "",
  requestId: "",
  reason: "",
};

const DEFAULT_BET_INTERVENTION_FORM: BetInterventionForm = {
  betId: "",
  action: "cancel",
  reason: "",
  winningSelectionId: "",
  winningSelectionName: "",
  resultSource: "manual_ops",
};

const DEFAULT_PROVIDER_ACKNOWLEDGEMENT_SLA_SETTING: ProviderAcknowledgementSLASetting =
  {
    adapter: "",
    warningMinutes: ACKNOWLEDGEMENT_WARNING_MINUTES,
    criticalMinutes: ACKNOWLEDGEMENT_CRITICAL_MINUTES,
    updatedAt: "",
    updatedBy: "",
    source: "default",
  };

const coerceString = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
};

const coerceInt = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const coerceBool = (value: unknown): boolean => value === true;

const coercePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = coerceInt(value, fallback);
  if (parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const normalizeProviderAcknowledgementSLASetting = (
  value: Partial<ProviderAcknowledgementSLASetting>,
): ProviderAcknowledgementSLASetting => {
  const warningMinutes = coercePositiveInt(
    value.warningMinutes,
    DEFAULT_PROVIDER_ACKNOWLEDGEMENT_SLA_SETTING.warningMinutes,
  );
  const criticalMinutes = Math.max(
    warningMinutes + 1,
    coercePositiveInt(
      value.criticalMinutes,
      DEFAULT_PROVIDER_ACKNOWLEDGEMENT_SLA_SETTING.criticalMinutes,
    ),
  );
  const sourceValue = coerceString(value.source).toLowerCase();
  return {
    adapter: coerceString(value.adapter),
    warningMinutes,
    criticalMinutes,
    updatedAt: coerceString(value.updatedAt),
    updatedBy: coerceString(value.updatedBy),
    source: sourceValue === "override" ? "override" : "default",
  };
};

const normalizeStream = (stream: Partial<FeedStreamStatus>): FeedStreamStatus => ({
  adapter: coerceString(stream.adapter),
  stream: coerceString(stream.stream),
  state: coerceString(stream.state),
  applied: coerceInt(stream.applied),
  skipped: coerceInt(stream.skipped),
  replayCount: coerceInt(stream.replayCount),
  duplicateCount: coerceInt(stream.duplicateCount),
  gapCount: coerceInt(stream.gapCount),
  errorCount: coerceInt(stream.errorCount),
  lastLagMs: coerceInt(stream.lastLagMs),
  lastRevision: coerceInt(stream.lastRevision),
  lastSequence: coerceInt(stream.lastSequence),
  lastBetId: coerceString(stream.lastBetId),
  lastPlayerId: coerceString(stream.lastPlayerId),
  lastRequestId: coerceString(stream.lastRequestId),
  lastEventAt: coerceString(stream.lastEventAt),
  lastError: coerceString(stream.lastError),
  updatedAt: coerceString(stream.updatedAt),
});

export const createDefaultProviderOpsState = (): ProviderOpsViewState => ({
  enabled: false,
  thresholds: { ...DEFAULT_THRESHOLDS },
  summary: { ...DEFAULT_SUMMARY },
  cancel: { ...DEFAULT_CANCEL_METRICS },
  streams: [],
});

export const createDefaultProviderAcknowledgementSLAState =
  (): ProviderAcknowledgementSLAState => ({
    defaultSetting: { ...DEFAULT_PROVIDER_ACKNOWLEDGEMENT_SLA_SETTING },
    overrides: [],
    effectiveByAdapter: {},
  });

export const createDefaultProviderCancelForm = (): ProviderCancelForm => ({
  ...DEFAULT_FORM,
});

export const normalizeProviderAcknowledgementSLASettings = (
  response?: ProviderAcknowledgementSLASettingsResponse,
): ProviderAcknowledgementSLAState => {
  const state = createDefaultProviderAcknowledgementSLAState();
  if (!response || typeof response !== "object") {
    return state;
  }

  state.defaultSetting = normalizeProviderAcknowledgementSLASetting(
    response.default || {},
  );
  state.defaultSetting.adapter = "";
  state.defaultSetting.source = "default";

  state.overrides = Array.isArray(response.overrides)
    ? response.overrides
        .map((value) =>
          normalizeProviderAcknowledgementSLASetting({
            ...value,
            source: "override",
          }),
        )
        .filter((value) => value.adapter)
        .sort((left, right) => left.adapter.localeCompare(right.adapter))
    : [];

  const effectiveEntries = Array.isArray(response.effective)
    ? response.effective
        .map((value) => normalizeProviderAcknowledgementSLASetting(value || {}))
        .filter((value) => value.adapter)
    : [];

  const effectiveByAdapter: Record<string, ProviderAcknowledgementSLASetting> = {};
  effectiveEntries.forEach((value) => {
    effectiveByAdapter[value.adapter] = value;
  });
  state.effectiveByAdapter = effectiveByAdapter;

  return state;
};

export const normalizeFeedHealthResponse = (
  response?: FeedHealthResponse,
): ProviderOpsViewState => {
  const view = createDefaultProviderOpsState();
  if (!response || typeof response !== "object") {
    return view;
  }

  const thresholds = response.thresholds || {};
  const summary = response.summary || {};
  const cancel = response.cancel || {};

  view.enabled = coerceBool(response.enabled);
  view.thresholds = {
    maxLagMs: coerceInt(thresholds.maxLagMs, DEFAULT_THRESHOLDS.maxLagMs),
    maxGapCount: coerceInt(
      thresholds.maxGapCount,
      DEFAULT_THRESHOLDS.maxGapCount,
    ),
    maxDuplicateCount: coerceInt(
      thresholds.maxDuplicateCount,
      DEFAULT_THRESHOLDS.maxDuplicateCount,
    ),
  };
  view.summary = {
    streamCount: coerceInt(summary.streamCount),
    unhealthyStreams: coerceInt(summary.unhealthyStreams),
    totalApplied: coerceInt(summary.totalApplied),
    totalErrors: coerceInt(summary.totalErrors),
    maxLagMs: coerceInt(summary.maxLagMs),
  };
  view.cancel = {
    totalAttempts: coerceInt(cancel.totalAttempts),
    totalRetries: coerceInt(cancel.totalRetries),
    totalFallback: coerceInt(cancel.totalFallback),
    totalSuccess: coerceInt(cancel.totalSuccess),
    totalFailed: coerceInt(cancel.totalFailed),
  };

  view.streams = Array.isArray(response.streams)
    ? response.streams
        .map((stream) => normalizeStream(stream || {}))
        .filter((stream) => stream.adapter && stream.stream)
    : [];

  if (view.summary.streamCount <= 0) {
    view.summary.streamCount = view.streams.length;
  }

  return view;
};

export const buildProviderCancelPayload = (
  form: ProviderCancelForm,
): ProviderCancelRequest => {
  const payload: ProviderCancelRequest = {
    adapter: coerceString(form.adapter),
    playerId: coerceString(form.playerId),
    betId: coerceString(form.betId),
    requestId: coerceString(form.requestId),
    reason: coerceString(form.reason),
  };

  if (!payload.reason) {
    payload.reason = "manual provider cancel";
  }

  return payload;
};

export const canSubmitProviderCancel = (
  payload: ProviderCancelRequest,
): boolean =>
  !!(
    coerceString(payload.adapter) &&
    coerceString(payload.playerId) &&
    coerceString(payload.betId) &&
    coerceString(payload.requestId)
  );

export const buildProviderAuditLogQuery = (): Record<string, string | number> => ({
  action: "provider.cancel.succeeded",
  p: 1,
  limit: 20,
});

export const buildProviderStreamAuditLogQuery = (
  stream: Pick<FeedStreamStatus, "adapter" | "state" | "lastError">,
): Record<string, string | number> => {
  const hasError =
    coerceString(stream.state).toLowerCase() === "error" ||
    !!coerceString(stream.lastError);
  const query: Record<string, string | number> = {
    action: hasError ? "provider.cancel.failed" : "provider.cancel.succeeded",
    p: 1,
    limit: 20,
  };
  const actorId = coerceString(stream.adapter);
  if (actorId) {
    query.actorId = actorId;
  }
  return query;
};

export const buildProviderAcknowledgementAuditLogQuery = (
  stream: Pick<FeedStreamStatus, "adapter" | "stream">,
  acknowledgement: Pick<StreamAcknowledgement, "lastAction">,
): Record<string, string | number> => {
  const lastAction = coerceString(acknowledgement.lastAction).toLowerCase();
  let action = "provider.stream.acknowledged";
  let preset = "provider-acknowledged";
  if (lastAction === "resolved") {
    action = "provider.stream.resolved";
    preset = "provider-resolved";
  } else if (lastAction === "reopened") {
    action = "provider.stream.reopened";
    preset = "provider-reopened";
  } else if (lastAction === "reassigned") {
    action = "provider.stream.reassigned";
    preset = "provider-reassigned";
  }
  return {
    preset,
    action,
    targetId: buildStreamKey(stream),
    p: 1,
    limit: 20,
  };
};

export const buildProviderAcknowledgementSLAAuditLogQuery = (
  adapter?: string,
): Record<string, string | number> => {
  const normalizedAdapter = coerceString(adapter);
  if (normalizedAdapter) {
    return {
      preset: "provider-ack-sla-adapter",
      action: "provider.stream.sla.adapter.updated",
      targetId: normalizedAdapter,
      p: 1,
      limit: 20,
    };
  }
  return {
    preset: "provider-ack-sla-default",
    action: "provider.stream.sla.default.updated",
    targetId: "provider.stream.sla.default",
    p: 1,
    limit: 20,
  };
};

export const createDefaultBetInterventionForm = (): BetInterventionForm => ({
  ...DEFAULT_BET_INTERVENTION_FORM,
});

export const buildBetInterventionPayload = (
  form: BetInterventionForm,
): BetInterventionRequest => {
  const action = coerceString(form.action) as BetLifecycleAction;
  const reason = coerceString(form.reason) || "manual settlement intervention";
  if (action === "settle") {
    return {
      reason,
      winningSelectionId: coerceString(form.winningSelectionId),
      winningSelectionName: coerceString(form.winningSelectionName),
      resultSource: coerceString(form.resultSource) || "manual_ops",
    };
  }
  return {
    reason,
  };
};

export const canSubmitBetIntervention = (form: BetInterventionForm): boolean => {
  const betId = coerceString(form.betId);
  const reason = coerceString(form.reason);
  const action = coerceString(form.action) as BetLifecycleAction;
  if (!betId || !reason) {
    return false;
  }
  if (action === "settle" && !coerceString(form.winningSelectionId)) {
    return false;
  }
  return action === "settle" || action === "cancel" || action === "refund";
};

export const buildBetInterventionAuditLogQuery = (
  action: BetLifecycleAction,
): Record<string, string | number> => {
  const mappedAction =
    action === "settle"
      ? "bet.settled"
      : action === "refund"
        ? "bet.refunded"
        : "bet.cancelled";
  return {
    action: mappedAction,
    p: 1,
    limit: 20,
  };
};

export const computeStreamBreaches = (
  stream: FeedStreamStatus,
  thresholds: FeedThresholds,
): StreamBreaches => ({
  lag: stream.lastLagMs > thresholds.maxLagMs,
  gap: stream.gapCount > thresholds.maxGapCount,
  duplicate: stream.duplicateCount > thresholds.maxDuplicateCount,
  error: stream.state.toLowerCase() === "error" || !!stream.lastError,
});

export const buildStreamKey = (
  stream: Pick<FeedStreamStatus, "adapter" | "stream">,
): string => `${coerceString(stream.adapter)}:${coerceString(stream.stream)}`;

export const parseProviderStreamKey = (
  streamKey: string,
): { adapter: string; stream: string } => {
  const [adapter, stream] = `${streamKey || ""}`.split(":", 2);
  return {
    adapter: coerceString(adapter),
    stream: coerceString(stream),
  };
};

export const buildProviderAcknowledgementSLAUpdatePayload = (
  adapter: string,
  warningMinutes: number,
  criticalMinutes: number,
): ProviderAcknowledgementSLAUpdateRequest => ({
  adapter: coerceString(adapter) || undefined,
  warningMinutes: coercePositiveInt(
    warningMinutes,
    DEFAULT_PROVIDER_ACKNOWLEDGEMENT_SLA_SETTING.warningMinutes,
  ),
  criticalMinutes: Math.max(
    coercePositiveInt(
      warningMinutes,
      DEFAULT_PROVIDER_ACKNOWLEDGEMENT_SLA_SETTING.warningMinutes,
    ) + 1,
    coercePositiveInt(
      criticalMinutes,
      DEFAULT_PROVIDER_ACKNOWLEDGEMENT_SLA_SETTING.criticalMinutes,
    ),
  ),
});

export const resolveProviderAcknowledgementSLAThresholds = (
  adapter: string,
  state?: ProviderAcknowledgementSLAState,
): Pick<ProviderAcknowledgementSLASetting, "warningMinutes" | "criticalMinutes"> => {
  const fallback = state?.defaultSetting || DEFAULT_PROVIDER_ACKNOWLEDGEMENT_SLA_SETTING;
  const normalizedAdapter = coerceString(adapter);
  if (normalizedAdapter && state?.effectiveByAdapter?.[normalizedAdapter]) {
    const setting = state.effectiveByAdapter[normalizedAdapter];
    return {
      warningMinutes: setting.warningMinutes,
      criticalMinutes: setting.criticalMinutes,
    };
  }
  return {
    warningMinutes: fallback.warningMinutes,
    criticalMinutes: fallback.criticalMinutes,
  };
};

export const buildProviderStreamAcknowledgementPayload = (
  stream: Pick<FeedStreamStatus, "adapter" | "stream">,
  operator: string,
  note: string,
  action: ProviderAcknowledgementAction = "acknowledge",
): ProviderStreamAcknowledgementRequest => ({
  streamKey: buildStreamKey(stream),
  adapter: coerceString(stream.adapter),
  stream: coerceString(stream.stream),
  action,
  operator: coerceString(operator),
  note: coerceString(note),
});

export const normalizeProviderStreamAcknowledgements = (
  response?: ProviderStreamAcknowledgementsResponse,
): Record<string, StreamAcknowledgement> => {
  const out: Record<string, StreamAcknowledgement> = {};
  if (!response || !Array.isArray(response.items)) {
    return out;
  }
  response.items.forEach((item) => {
    const streamKey = coerceString(item.streamKey);
    if (!streamKey) {
      return;
    }
    const streamKeyParts = parseProviderStreamKey(streamKey);
    const operator = coerceString(item.operator);
    const note = coerceString(item.note);
    const status = coerceString(item.status) || "acknowledged";
    const lastAction = coerceString(item.lastAction) || "acknowledged";
    const acknowledgedAt = coerceString(item.acknowledgedAt);
    if (!operator || !note || !acknowledgedAt) {
      return;
    }
    out[streamKey] = {
      streamKey,
      adapter: streamKeyParts.adapter,
      stream: streamKeyParts.stream,
      operator,
      note,
      status,
      lastAction,
      acknowledgedAt,
    };
  });
  return out;
};

export const computeAcknowledgementStaleness = (
  acknowledgedAt: string,
  now = new Date(),
  thresholds?: Pick<
    ProviderAcknowledgementSLASetting,
    "warningMinutes" | "criticalMinutes"
  >,
): AcknowledgementStaleness => {
  const parsed = Date.parse(coerceString(acknowledgedAt));
  if (Number.isNaN(parsed)) {
    return "fresh";
  }
  const ageMs = now.getTime() - parsed;
  if (ageMs <= 0) {
    return "fresh";
  }
  const ageMinutes = ageMs / 60000;
  const warningMinutes = coercePositiveInt(
    thresholds?.warningMinutes,
    ACKNOWLEDGEMENT_WARNING_MINUTES,
  );
  const criticalMinutes = Math.max(
    warningMinutes + 1,
    coercePositiveInt(
      thresholds?.criticalMinutes,
      ACKNOWLEDGEMENT_CRITICAL_MINUTES,
    ),
  );
  if (ageMinutes >= criticalMinutes) {
    return "critical";
  }
  if (ageMinutes >= warningMinutes) {
    return "warning";
  }
  return "fresh";
};

export const isStreamUnhealthy = (
  stream: FeedStreamStatus,
  thresholds: FeedThresholds,
): boolean => {
  const breaches = computeStreamBreaches(stream, thresholds);
  return breaches.lag || breaches.gap || breaches.duplicate || breaches.error;
};

export const computeStreamRiskScore = (
  stream: FeedStreamStatus,
  thresholds: FeedThresholds,
): number => {
  const breaches = computeStreamBreaches(stream, thresholds);
  let score = 0;
  if (breaches.error) {
    score += 1000;
  }
  if (breaches.gap) {
    score += 300;
  }
  if (breaches.duplicate) {
    score += 200;
  }
  if (breaches.lag) {
    score += 100;
  }
  if (stream.lastLagMs > thresholds.maxLagMs) {
    score += Math.min(stream.lastLagMs - thresholds.maxLagMs, 999);
  }
  score += Math.min(stream.errorCount, 50) * 10;
  score += Math.min(stream.gapCount, 50) * 5;
  return score;
};

export const sortStreamsByRisk = (
  streams: FeedStreamStatus[],
  thresholds: FeedThresholds,
): FeedStreamStatus[] =>
  [...streams].sort((left, right) => {
    const riskDelta =
      computeStreamRiskScore(right, thresholds) -
      computeStreamRiskScore(left, thresholds);
    if (riskDelta !== 0) {
      return riskDelta;
    }
    return right.lastLagMs - left.lastLagMs;
  });

export const computeStreamRiskSummary = (
  streams: FeedStreamStatus[],
  thresholds: FeedThresholds,
): StreamRiskSummary => {
  const summary: StreamRiskSummary = {
    lag: 0,
    gap: 0,
    duplicate: 0,
    error: 0,
    unhealthy: 0,
    healthy: 0,
  };

  streams.forEach((stream) => {
    const breaches = computeStreamBreaches(stream, thresholds);
    if (breaches.lag) {
      summary.lag += 1;
    }
    if (breaches.gap) {
      summary.gap += 1;
    }
    if (breaches.duplicate) {
      summary.duplicate += 1;
    }
    if (breaches.error) {
      summary.error += 1;
    }
    if (breaches.lag || breaches.gap || breaches.duplicate || breaches.error) {
      summary.unhealthy += 1;
      return;
    }
    summary.healthy += 1;
  });

  return summary;
};
