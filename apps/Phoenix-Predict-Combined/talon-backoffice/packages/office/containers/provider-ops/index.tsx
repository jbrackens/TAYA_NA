import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { Method } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";
import { useRouter } from "next/router";
import PageHeader from "../../components/layout/page-header";
import Table from "../../components/layout/table";
import { useApi } from "../../services/api/api-service";
import {
  BetInterventionForm,
  BetLifecycleAction,
  buildStreamKey,
  buildBetInterventionAuditLogQuery,
  buildProviderAcknowledgementSLAAuditLogQuery,
  buildProviderAcknowledgementSLAUpdatePayload,
  buildBetInterventionPayload,
  buildProviderStreamAcknowledgementPayload,
  buildProviderAcknowledgementAuditLogQuery,
  buildProviderAuditLogQuery,
  buildProviderCancelPayload,
  buildProviderStreamAuditLogQuery,
  canSubmitBetIntervention,
  canSubmitProviderCancel,
  computeStreamRiskScore,
  computeStreamRiskSummary,
  computeAcknowledgementStaleness,
  computeStreamBreaches,
  createDefaultProviderAcknowledgementSLAState,
  createDefaultBetInterventionForm,
  createDefaultProviderCancelForm,
  createDefaultProviderOpsState,
  FeedHealthResponse,
  FeedStreamStatus,
  isStreamUnhealthy,
  normalizeProviderStreamAcknowledgements,
  normalizeProviderAcknowledgementSLASettings,
  normalizeFeedHealthResponse,
  ProviderAcknowledgementSLASettingsResponse,
  ProviderAcknowledgementSLAUpdateRequest,
  ProviderAcknowledgementAction,
  ProviderCancelForm,
  ProviderCancelResponse,
  ProviderStreamAcknowledgement,
  ProviderStreamAcknowledgementRequest,
  ProviderStreamAcknowledgementsResponse,
  resolveProviderAcknowledgementSLAThresholds,
  StreamAcknowledgement,
  sortStreamsByRisk,
} from "./contracts";
import VerificationReviewPanel from "./verification-review";
import CashierReviewPanel from "./cashier-review";

const statusColor = (state: string): string => {
  const normalized = `${state || ""}`.toLowerCase();
  if (normalized === "running" || normalized === "connected") {
    return "success";
  }
  if (normalized === "error") {
    return "error";
  }
  if (normalized === "stopped") {
    return "default";
  }
  return "processing";
};

const ProviderOpsContainer = () => {
  const { t } = useTranslation("page-provider-ops");
  const router = useRouter();

  const [providerOpsState, setProviderOpsState] = useState(
    createDefaultProviderOpsState(),
  );
  const [cancelForm, setCancelForm] = useState<ProviderCancelForm>(
    createDefaultProviderCancelForm(),
  );
  const [betInterventionForm, setBetInterventionForm] =
    useState<BetInterventionForm>(createDefaultBetInterventionForm());
  const [betIsMultiLeg, setBetIsMultiLeg] = useState(false);
  const [adapterFilter, setAdapterFilter] = useState("");
  const [showUnhealthyOnly, setShowUnhealthyOnly] = useState(false);
  const [lastCancelResult, setLastCancelResult] =
    useState<ProviderCancelResponse | null>(null);
  const [lastBetInterventionResult, setLastBetInterventionResult] = useState<
    Record<string, any> | null
  >(null);
  const [acknowledgements, setAcknowledgements] = useState<
    Record<string, StreamAcknowledgement>
  >({});
  const [acknowledgementSLAState, setAcknowledgementSLAState] = useState(
    createDefaultProviderAcknowledgementSLAState(),
  );
  const [ackForm, setAckForm] = useState({
    streamKey: "",
    action: "acknowledge" as ProviderAcknowledgementAction,
    operator: "",
    note: "",
  });
  const [ackSLAForm, setAckSLAForm] = useState({
    defaultWarningMinutes: "",
    defaultCriticalMinutes: "",
    adapter: "",
    adapterWarningMinutes: "",
    adapterCriticalMinutes: "",
  });

  const [triggerFeedHealth, feedLoading, feedResponse] =
    useApi<FeedHealthResponse>("admin/feed-health", Method.GET);
  const [triggerProviderCancel, cancelLoading, cancelResponse] =
    useApi<ProviderCancelResponse>("admin/provider/cancel", Method.POST);
  const [triggerBetIntervention, interventionLoading, interventionResponse] =
    useApi<Record<string, any>>("admin/bets/:id/lifecycle/:action", Method.POST);
  const [triggerBetDetailLookup] =
    useApi<Record<string, any>>("admin/bets/:id", Method.GET);
  const [triggerAcknowledgementList, acknowledgementListLoading, acknowledgementListResponse] =
    useApi<ProviderStreamAcknowledgementsResponse>(
      "admin/provider/acknowledgements",
      Method.GET,
    );
  const [triggerAcknowledgementUpsert, acknowledgementUpsertLoading] = useApi<
    ProviderStreamAcknowledgement,
    any,
    ProviderStreamAcknowledgementRequest
  >("admin/provider/acknowledgements", Method.POST);
  const [
    triggerAcknowledgementSLASettings,
    acknowledgementSLASettingsLoading,
    acknowledgementSLASettingsResponse,
  ] = useApi<ProviderAcknowledgementSLASettingsResponse>(
    "admin/provider/acknowledgement-sla",
    Method.GET,
  );
  const [triggerAcknowledgementSLAUpdate, acknowledgementSLAUpdateLoading] =
    useApi<Record<string, any>, any, ProviderAcknowledgementSLAUpdateRequest>(
      "admin/provider/acknowledgement-sla",
      Method.POST,
    );

  useEffect(() => {
    // `useApi` does not guarantee stable trigger identities across renders.
    // Bootstrapping this screen should happen once on mount, otherwise a failed
    // backend can cause an infinite refetch/render loop in the live UI.
    void triggerFeedHealth();
    void triggerAcknowledgementList();
    void triggerAcknowledgementSLASettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!feedResponse.succeeded) {
      return;
    }
    setProviderOpsState(normalizeFeedHealthResponse(feedResponse.data));
  }, [feedResponse.succeeded, feedResponse.data]);

  useEffect(() => {
    if (!cancelResponse.succeeded || !cancelResponse.data) {
      return;
    }
    setLastCancelResult(cancelResponse.data);
  }, [cancelResponse.succeeded, cancelResponse.data]);

  useEffect(() => {
    if (!interventionResponse.succeeded || !interventionResponse.data) {
      return;
    }
    setLastBetInterventionResult(interventionResponse.data);
  }, [interventionResponse.succeeded, interventionResponse.data]);

  useEffect(() => {
    if (!acknowledgementListResponse.succeeded) {
      return;
    }
    setAcknowledgements(
      normalizeProviderStreamAcknowledgements(acknowledgementListResponse.data),
    );
  }, [acknowledgementListResponse.succeeded, acknowledgementListResponse.data]);

  useEffect(() => {
    if (!acknowledgementSLASettingsResponse.succeeded) {
      return;
    }
    const normalized = normalizeProviderAcknowledgementSLASettings(
      acknowledgementSLASettingsResponse.data,
    );
    setAcknowledgementSLAState(normalized);
    setAckSLAForm((previous) => {
      const adapter =
        `${previous.adapter || ""}`.trim() ||
        Object.keys(normalized.effectiveByAdapter).sort()[0] ||
        "";
      const adapterThresholds = resolveProviderAcknowledgementSLAThresholds(
        adapter,
        normalized,
      );
      return {
        defaultWarningMinutes: `${normalized.defaultSetting.warningMinutes}`,
        defaultCriticalMinutes: `${normalized.defaultSetting.criticalMinutes}`,
        adapter,
        adapterWarningMinutes: `${adapterThresholds.warningMinutes}`,
        adapterCriticalMinutes: `${adapterThresholds.criticalMinutes}`,
      };
    });
  }, [
    acknowledgementSLASettingsResponse.succeeded,
    acknowledgementSLASettingsResponse.data,
  ]);

  const adapterOptions = useMemo(() => {
    const set = new Set<string>();
    providerOpsState.streams.forEach((stream) => {
      if (stream.adapter) {
        set.add(stream.adapter);
      }
    });
    Object.keys(acknowledgementSLAState.effectiveByAdapter).forEach((adapter) =>
      set.add(adapter),
    );
    if (cancelForm.adapter) {
      set.add(cancelForm.adapter);
    }
    return Array.from(set).sort();
  }, [
    providerOpsState.streams,
    acknowledgementSLAState.effectiveByAdapter,
    cancelForm.adapter,
  ]);

  const filteredStreams = useMemo(() => {
    return providerOpsState.streams.filter((stream) => {
      if (adapterFilter && stream.adapter !== adapterFilter) {
        return false;
      }
      if (showUnhealthyOnly) {
        return isStreamUnhealthy(stream, providerOpsState.thresholds);
      }
      return true;
    });
  }, [
    providerOpsState.streams,
    providerOpsState.thresholds,
    adapterFilter,
    showUnhealthyOnly,
  ]);

  const triageSummary = useMemo(
    () =>
      computeStreamRiskSummary(providerOpsState.streams, providerOpsState.thresholds),
    [providerOpsState.streams, providerOpsState.thresholds],
  );
  const resolvedAcknowledgementsCount = useMemo(
    () =>
      Object.values(acknowledgements).filter(
        (acknowledgement) => acknowledgement.status === "resolved",
      ).length,
    [acknowledgements],
  );
  const activeAcknowledgementsCount = useMemo(
    () =>
      Object.values(acknowledgements).filter(
        (acknowledgement) => acknowledgement.status !== "resolved",
      ).length,
    [acknowledgements],
  );
  const staleAcknowledgementsCount = useMemo(
    () =>
      Object.values(acknowledgements).filter(
        (acknowledgement) =>
          acknowledgement.status !== "resolved" &&
          computeAcknowledgementStaleness(
            acknowledgement.acknowledgedAt,
            new Date(),
            resolveProviderAcknowledgementSLAThresholds(
              acknowledgement.adapter,
              acknowledgementSLAState,
            ),
          ) !==
            "fresh",
      ).length,
    [acknowledgements, acknowledgementSLAState],
  );

  const sortedStreams = useMemo(
    () => sortStreamsByRisk(filteredStreams, providerOpsState.thresholds),
    [filteredStreams, providerOpsState.thresholds],
  );

  const effectiveAcknowledgementSLASettings = useMemo(
    () =>
      Object.values(acknowledgementSLAState.effectiveByAdapter).sort((left, right) =>
        left.adapter.localeCompare(right.adapter),
      ),
    [acknowledgementSLAState.effectiveByAdapter],
  );

  const defaultAckStreamKey = sortedStreams[0]
    ? buildStreamKey(sortedStreams[0])
    : "";
  const selectedAckStreamKey = ackForm.streamKey || defaultAckStreamKey;

  useEffect(() => {
    if (ackForm.streamKey) {
      return;
    }
    if (sortedStreams.length === 0) {
      return;
    }
    setAckForm((previous) => ({
      ...previous,
      streamKey: buildStreamKey(sortedStreams[0]),
    }));
  }, [ackForm.streamKey, sortedStreams]);

  useEffect(() => {
    if (!ackForm.streamKey) {
      return;
    }
    const exists = sortedStreams.some(
      (stream) => buildStreamKey(stream) === ackForm.streamKey,
    );
    if (exists) {
      return;
    }
    setAckForm((previous) => ({
      ...previous,
      streamKey: sortedStreams[0] ? buildStreamKey(sortedStreams[0]) : "",
    }));
  }, [ackForm.streamKey, sortedStreams]);

  const renderBreachTags = (stream: FeedStreamStatus) => {
    const breaches = computeStreamBreaches(stream, providerOpsState.thresholds);
    const tags = [];
    if (breaches.lag) {
      tags.push(
        <Tag color="orange" key="lag">
          {t("BREACH_LAG")}
        </Tag>,
      );
    }
    if (breaches.gap) {
      tags.push(
        <Tag color="gold" key="gap">
          {t("BREACH_GAP")}
        </Tag>,
      );
    }
    if (breaches.duplicate) {
      tags.push(
        <Tag color="purple" key="duplicate">
          {t("BREACH_DUPLICATE")}
        </Tag>,
      );
    }
    if (breaches.error) {
      tags.push(
        <Tag color="red" key="error">
          {t("BREACH_ERROR")}
        </Tag>,
      );
    }
    if (tags.length === 0) {
      return <Tag color="success">{t("BREACH_NONE")}</Tag>;
    }
    return <Space wrap>{tags}</Space>;
  };

  const refreshFeed = async () => {
    await triggerFeedHealth();
    await triggerAcknowledgementList();
    await triggerAcknowledgementSLASettings();
  };

  const parsePositiveInt = (value: string): number => {
    const parsed = Number.parseInt(`${value || ""}`.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return parsed;
  };

  const defaultWarningMinutes = parsePositiveInt(ackSLAForm.defaultWarningMinutes);
  const defaultCriticalMinutes = parsePositiveInt(ackSLAForm.defaultCriticalMinutes);
  const adapterWarningMinutes = parsePositiveInt(ackSLAForm.adapterWarningMinutes);
  const adapterCriticalMinutes = parsePositiveInt(ackSLAForm.adapterCriticalMinutes);
  const canSubmitDefaultSLA =
    defaultWarningMinutes > 0 && defaultCriticalMinutes > defaultWarningMinutes;
  const canSubmitAdapterSLA =
    !!`${ackSLAForm.adapter || ""}`.trim() &&
    adapterWarningMinutes > 0 &&
    adapterCriticalMinutes > adapterWarningMinutes;

  const applyAdapterSLASettings = (adapter: string) => {
    const thresholds = resolveProviderAcknowledgementSLAThresholds(
      adapter,
      acknowledgementSLAState,
    );
    setAckSLAForm((previous) => ({
      ...previous,
      adapter,
      adapterWarningMinutes: `${thresholds.warningMinutes}`,
      adapterCriticalMinutes: `${thresholds.criticalMinutes}`,
    }));
  };

  const submitDefaultAcknowledgementSLA = () => {
    if (!canSubmitDefaultSLA) {
      return;
    }
    void (async () => {
      await triggerAcknowledgementSLAUpdate(
        buildProviderAcknowledgementSLAUpdatePayload(
          "",
          defaultWarningMinutes,
          defaultCriticalMinutes,
        ),
      );
      await triggerAcknowledgementSLASettings();
    })();
  };

  const submitAdapterAcknowledgementSLA = () => {
    const adapter = `${ackSLAForm.adapter || ""}`.trim();
    if (!canSubmitAdapterSLA || !adapter) {
      return;
    }
    void (async () => {
      await triggerAcknowledgementSLAUpdate(
        buildProviderAcknowledgementSLAUpdatePayload(
          adapter,
          adapterWarningMinutes,
          adapterCriticalMinutes,
        ),
      );
      await triggerAcknowledgementSLASettings();
    })();
  };

  const resetAcknowledgementSLAForm = () => {
    const firstAdapter = Object.keys(acknowledgementSLAState.effectiveByAdapter).sort()[0] || "";
    const adapter = `${ackSLAForm.adapter || ""}`.trim() || firstAdapter;
    const adapterThresholds = resolveProviderAcknowledgementSLAThresholds(
      adapter,
      acknowledgementSLAState,
    );
    setAckSLAForm({
      defaultWarningMinutes: `${acknowledgementSLAState.defaultSetting.warningMinutes}`,
      defaultCriticalMinutes: `${acknowledgementSLAState.defaultSetting.criticalMinutes}`,
      adapter,
      adapterWarningMinutes: `${adapterThresholds.warningMinutes}`,
      adapterCriticalMinutes: `${adapterThresholds.criticalMinutes}`,
    });
  };

  const submitProviderCancel = async () => {
    const payload = buildProviderCancelPayload(cancelForm);
    if (!canSubmitProviderCancel(payload)) {
      return;
    }

    await triggerProviderCancel(payload);
    await triggerFeedHealth();
  };

  const resetCancelForm = () => {
    setCancelForm(createDefaultProviderCancelForm());
  };

  const submitBetIntervention = async () => {
    if (!canSubmitBetIntervention(betInterventionForm)) {
      return;
    }
    const payload = buildBetInterventionPayload(betInterventionForm);
    await triggerBetIntervention(payload, {
      id: betInterventionForm.betId.trim(),
      action: betInterventionForm.action,
    });
    await triggerFeedHealth();
  };

  // M3-S4: detect multi-leg bets to disable settle action
  useEffect(() => {
    const betId = (betInterventionForm.betId || "").trim();
    if (!betId || betId.length < 8) {
      setBetIsMultiLeg(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await triggerBetDetailLookup(undefined, { id: betId });
        const legs = Array.isArray((result as any)?.legs) ? (result as any).legs : [];
        setBetIsMultiLeg(legs.length > 0);
        // If bet is multi-leg and settle is selected, switch to cancel
        if (legs.length > 0 && betInterventionForm.action === "settle") {
          setBetInterventionForm((prev) => ({ ...prev, action: "cancel" }));
        }
      } catch {
        setBetIsMultiLeg(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [betInterventionForm.betId]);

  const resetBetInterventionForm = () => {
    setBetInterventionForm(createDefaultBetInterventionForm());
    setBetIsMultiLeg(false);
  };

  const openAuditLogs = () => {
    router.push({
      pathname: "/logs",
      query: buildProviderAuditLogQuery(),
    });
  };

  const openBetAuditLogs = () => {
    const action = betInterventionForm.action || "cancel";
    router.push({
      pathname: "/logs",
      query: buildBetInterventionAuditLogQuery(action as BetLifecycleAction),
    });
  };

  const openAcknowledgementSLAAuditLogs = () => {
    router.push({
      pathname: "/logs",
      query: buildProviderAcknowledgementSLAAuditLogQuery(ackSLAForm.adapter),
    });
  };

  const prefillCancelFromStream = (stream: FeedStreamStatus) => {
    setCancelForm((previous) => ({
      ...previous,
      adapter: stream.adapter || previous.adapter,
      playerId: stream.lastPlayerId || previous.playerId,
      betId: stream.lastBetId || previous.betId,
      requestId: stream.lastRequestId || previous.requestId,
      reason:
        previous.reason ||
        `triage:${stream.adapter || "unknown"}:${stream.stream || "stream"}`,
    }));
  };

  const prefillInterventionFromStream = (stream: FeedStreamStatus) => {
    setBetInterventionForm((previous) => ({
      ...previous,
      action: "cancel",
      betId: stream.lastBetId || previous.betId,
      reason:
        previous.reason ||
        `triage:${stream.adapter || "unknown"}:${stream.stream || "stream"}`,
      resultSource: "provider_ops_triage",
    }));
  };

  const openStreamAuditLogs = (stream: FeedStreamStatus) => {
    router.push({
      pathname: "/logs",
      query: buildProviderStreamAuditLogQuery(stream),
    });
  };

  const openAcknowledgementAuditLogs = (
    stream: FeedStreamStatus,
    acknowledgement: StreamAcknowledgement,
  ) => {
    router.push({
      pathname: "/logs",
      query: buildProviderAcknowledgementAuditLogQuery(stream, acknowledgement),
    });
  };

  const submitLabelForAckAction = (
    action: ProviderAcknowledgementAction,
  ): string => {
    if (action === "resolve") {
      return t("ACK_ACTION_RESOLVE");
    }
    if (action === "reopen") {
      return t("ACK_ACTION_REOPEN");
    }
    if (action === "reassign") {
      return t("ACK_ACTION_REASSIGN");
    }
    return t("ACK_ACTION_ACKNOWLEDGE");
  };

  const prepareAcknowledgementAction = (
    stream: FeedStreamStatus,
    action: ProviderAcknowledgementAction,
  ) => {
    setAckForm((previous) => ({
      ...previous,
      streamKey: buildStreamKey(stream),
      action,
      note:
        previous.note ||
        (action === "resolve"
          ? `Resolved issue for ${stream.adapter}:${stream.stream}`
          : action === "reopen"
            ? `Reopened issue for ${stream.adapter}:${stream.stream}`
            : action === "reassign"
              ? `Reassigned ownership for ${stream.adapter}:${stream.stream}`
              : previous.note),
    }));
  };

  const submitAcknowledgement = () => {
    const streamKey = `${selectedAckStreamKey || ""}`.trim();
    const action = ackForm.action;
    const operator = `${ackForm.operator || ""}`.trim();
    const note = `${ackForm.note || ""}`.trim();
    if (!streamKey || !operator || !note) {
      return;
    }
    const selectedStream = sortedStreams.find(
      (stream) => buildStreamKey(stream) === streamKey,
    );
    if (!selectedStream) {
      return;
    }
    void (async () => {
      await triggerAcknowledgementUpsert(
        buildProviderStreamAcknowledgementPayload(
          selectedStream,
          operator,
          note,
          action,
        ),
      );
      await triggerAcknowledgementList();
      setAckForm((previous) => ({
        ...previous,
        note: "",
      }));
    })();
  };

  const resetAcknowledgementForm = () => {
    setAckForm((previous) => ({
      ...previous,
      action: "acknowledge",
      note: "",
      operator: "",
      streamKey: defaultAckStreamKey,
    }));
  };

  const columns = [
    {
      title: t("HEADER_ADAPTER"),
      dataIndex: "adapter",
      key: "adapter",
    },
    {
      title: t("HEADER_STREAM"),
      dataIndex: "stream",
      key: "stream",
    },
    {
      title: t("HEADER_STATE"),
      dataIndex: "state",
      key: "state",
      render: (state: string) => <Tag color={statusColor(state)}>{state || "-"}</Tag>,
    },
    {
      title: t("HEADER_BREACHES"),
      key: "breaches",
      render: (_: unknown, stream: FeedStreamStatus) => renderBreachTags(stream),
    },
    {
      title: t("HEADER_RISK_SCORE"),
      key: "riskScore",
      render: (_: unknown, stream: FeedStreamStatus) =>
        computeStreamRiskScore(stream, providerOpsState.thresholds),
    },
    {
      title: t("HEADER_LAST_LAG_MS"),
      dataIndex: "lastLagMs",
      key: "lastLagMs",
    },
    {
      title: t("HEADER_DUPLICATES"),
      dataIndex: "duplicateCount",
      key: "duplicateCount",
    },
    {
      title: t("HEADER_GAPS"),
      dataIndex: "gapCount",
      key: "gapCount",
    },
    {
      title: t("HEADER_ERRORS"),
      dataIndex: "errorCount",
      key: "errorCount",
    },
    {
      title: t("HEADER_LAST_REVISION"),
      dataIndex: "lastRevision",
      key: "lastRevision",
    },
    {
      title: t("HEADER_LAST_SEQUENCE"),
      dataIndex: "lastSequence",
      key: "lastSequence",
    },
    {
      title: t("HEADER_UPDATED_AT"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (value: string) => value || "-",
    },
    {
      title: t("HEADER_LAST_ERROR"),
      dataIndex: "lastError",
      key: "lastError",
      render: (value: string) => value || "-",
    },
    {
      title: t("HEADER_ACKNOWLEDGED"),
      key: "acknowledged",
      render: (_: unknown, stream: FeedStreamStatus) => {
        const acknowledgement = acknowledgements[buildStreamKey(stream)];
        if (!acknowledgement) {
          return <Tag>{t("ACK_STATUS_PENDING")}</Tag>;
        }
        const resolved = acknowledgement.status === "resolved";
        const slaThresholds = resolveProviderAcknowledgementSLAThresholds(
          stream.adapter,
          acknowledgementSLAState,
        );
        const staleness = computeAcknowledgementStaleness(
          acknowledgement.acknowledgedAt,
          new Date(),
          slaThresholds,
        );
        return (
          <Space direction="vertical" size={0}>
            <Tag color={resolved ? "green" : "blue"}>
              {resolved ? t("ACK_STATUS_RESOLVED") : t("ACK_STATUS_ACKNOWLEDGED")}
            </Tag>
            {!resolved && staleness !== "fresh" ? (
              <Tag color={staleness === "critical" ? "red" : "orange"}>
                {staleness === "critical"
                  ? t("ACK_STALE_CRITICAL")
                  : t("ACK_STALE_WARNING")}
              </Tag>
            ) : null}
            <Typography.Text type="secondary">
              {acknowledgement.operator}
            </Typography.Text>
            <Typography.Text type="secondary">
              {acknowledgement.acknowledgedAt}
            </Typography.Text>
            <Typography.Text type="secondary">
              {acknowledgement.lastAction}
            </Typography.Text>
            <Typography.Text type="secondary">
              {acknowledgement.note}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: t("HEADER_ACTIONS"),
      key: "actions",
      render: (_: unknown, stream: FeedStreamStatus) => {
        const acknowledgement = acknowledgements[buildStreamKey(stream)];
        const resolved = acknowledgement?.status === "resolved";
        const slaThresholds = resolveProviderAcknowledgementSLAThresholds(
          stream.adapter,
          acknowledgementSLAState,
        );
        const staleness = acknowledgement
          ? computeAcknowledgementStaleness(
              acknowledgement.acknowledgedAt,
              new Date(),
              slaThresholds,
            )
          : "fresh";
        return (
          <Space wrap>
            <Button size="small" onClick={() => prefillCancelFromStream(stream)}>
              {t("ACTION_PREFILL_CANCEL")}
            </Button>
            <Button size="small" onClick={() => prefillInterventionFromStream(stream)}>
              {t("ACTION_PREFILL_INTERVENTION")}
            </Button>
            <Button size="small" onClick={() => openStreamAuditLogs(stream)}>
              {t("ACTION_STREAM_AUDIT")}
            </Button>
            {acknowledgement &&
            !resolved &&
            (staleness === "warning" || staleness === "critical") ? (
              <Button
                size="small"
                onClick={() => openAcknowledgementAuditLogs(stream, acknowledgement)}
              >
                {t("ACK_ACTION_STALE_AUDIT")}
              </Button>
            ) : null}
            <Button
              size="small"
              onClick={() => prepareAcknowledgementAction(stream, "reassign")}
            >
              {t("ACK_ACTION_PREPARE_REASSIGN")}
            </Button>
            {resolved ? (
              <Button
                size="small"
                onClick={() => prepareAcknowledgementAction(stream, "reopen")}
              >
                {t("ACK_ACTION_PREPARE_REOPEN")}
              </Button>
            ) : (
              <Button
                size="small"
                onClick={() => prepareAcknowledgementAction(stream, "resolve")}
              >
                {t("ACK_ACTION_PREPARE_RESOLVE")}
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title={t("HEADER")} backIcon={false} />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" onClick={refreshFeed} loading={feedLoading}>
            {t("ACTION_REFRESH")}
          </Button>
          <Button onClick={openAuditLogs}>{t("ACTION_OPEN_AUDIT")}</Button>
          <Select
            allowClear
            value={adapterFilter || undefined}
            onChange={(value) => setAdapterFilter(`${value || ""}`)}
            placeholder={t("FILTER_ADAPTER_PLACEHOLDER")}
            style={{ minWidth: 220 }}
          >
            {adapterOptions.map((adapter) => (
              <Select.Option key={adapter} value={adapter}>
                {adapter}
              </Select.Option>
            ))}
          </Select>
          <Space>
            <Typography.Text>{t("FILTER_UNHEALTHY_ONLY")}</Typography.Text>
            <Switch
              data-testid="provider-ops-unhealthy-toggle"
              checked={showUnhealthyOnly}
              onChange={(checked) => setShowUnhealthyOnly(checked)}
            />
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={feedLoading}>
            <Typography.Text type="secondary">{t("METRIC_RUNTIME")}</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {providerOpsState.enabled ? t("VALUE_ENABLED") : t("VALUE_DISABLED")}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={feedLoading}>
            <Typography.Text type="secondary">{t("METRIC_STREAM_COUNT")}</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {providerOpsState.summary.streamCount}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={feedLoading}>
            <Typography.Text type="secondary">{t("METRIC_UNHEALTHY_STREAMS")}</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {providerOpsState.summary.unhealthyStreams}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={feedLoading}>
            <Typography.Text type="secondary">{t("METRIC_TOTAL_ERRORS")}</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {providerOpsState.summary.totalErrors}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={t("THRESHOLDS_TITLE")} loading={feedLoading}>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              {t("THRESHOLD_LAG_MS")}: {providerOpsState.thresholds.maxLagMs}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              {t("THRESHOLD_GAPS")}: {providerOpsState.thresholds.maxGapCount}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("THRESHOLD_DUPLICATES")}: {providerOpsState.thresholds.maxDuplicateCount}
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t("CANCEL_METRICS_TITLE")} loading={feedLoading}>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              {t("CANCEL_TOTAL_ATTEMPTS")}: {providerOpsState.cancel.totalAttempts}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              {t("CANCEL_TOTAL_RETRIES")}: {providerOpsState.cancel.totalRetries}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              {t("CANCEL_TOTAL_SUCCESS")}: {providerOpsState.cancel.totalSuccess}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("CANCEL_TOTAL_FAILED")}: {providerOpsState.cancel.totalFailed}
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      <Card title={t("ACK_SLA_SETTINGS_TITLE")} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col span={24}>
            <Typography.Text type="secondary">
              {t("ACK_SLA_ACTIVE_DEFAULT")}:{" "}
              {acknowledgementSLAState.defaultSetting.warningMinutes}/
              {acknowledgementSLAState.defaultSetting.criticalMinutes}
            </Typography.Text>
          </Col>
          <Col xs={24} md={8}>
            <Input
              value={ackSLAForm.defaultWarningMinutes}
              onChange={(event) =>
                setAckSLAForm((previous) => ({
                  ...previous,
                  defaultWarningMinutes: event.target.value,
                }))
              }
              placeholder={t("ACK_SLA_FIELD_WARNING_MINUTES")}
            />
          </Col>
          <Col xs={24} md={8}>
            <Input
              value={ackSLAForm.defaultCriticalMinutes}
              onChange={(event) =>
                setAckSLAForm((previous) => ({
                  ...previous,
                  defaultCriticalMinutes: event.target.value,
                }))
              }
              placeholder={t("ACK_SLA_FIELD_CRITICAL_MINUTES")}
            />
          </Col>
          <Col xs={24} md={8}>
            <Button
              type="primary"
              onClick={submitDefaultAcknowledgementSLA}
              loading={acknowledgementSLAUpdateLoading}
              disabled={!canSubmitDefaultSLA}
            >
              {t("ACK_SLA_ACTION_SAVE_DEFAULT")}
            </Button>
          </Col>
          <Col xs={24} md={8}>
            <Select
              value={ackSLAForm.adapter || undefined}
              onChange={(value) => applyAdapterSLASettings(`${value || ""}`)}
              placeholder={t("ACK_SLA_FIELD_ADAPTER")}
              style={{ width: "100%" }}
            >
              {adapterOptions.map((adapter) => (
                <Select.Option key={adapter} value={adapter}>
                  {adapter}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <Input
              value={ackSLAForm.adapterWarningMinutes}
              onChange={(event) =>
                setAckSLAForm((previous) => ({
                  ...previous,
                  adapterWarningMinutes: event.target.value,
                }))
              }
              placeholder={t("ACK_SLA_FIELD_WARNING_MINUTES")}
            />
          </Col>
          <Col xs={24} md={8}>
            <Input
              value={ackSLAForm.adapterCriticalMinutes}
              onChange={(event) =>
                setAckSLAForm((previous) => ({
                  ...previous,
                  adapterCriticalMinutes: event.target.value,
                }))
              }
              placeholder={t("ACK_SLA_FIELD_CRITICAL_MINUTES")}
            />
          </Col>
          <Col span={24}>
            <Space>
              <Button
                type="primary"
                onClick={submitAdapterAcknowledgementSLA}
                loading={acknowledgementSLAUpdateLoading}
                disabled={!canSubmitAdapterSLA}
              >
                {t("ACK_SLA_ACTION_SAVE_ADAPTER")}
              </Button>
              <Button
                onClick={resetAcknowledgementSLAForm}
                loading={acknowledgementSLASettingsLoading}
              >
                {t("ACK_SLA_ACTION_RESET")}
              </Button>
              <Button onClick={openAcknowledgementSLAAuditLogs}>
                {t("ACK_SLA_ACTION_OPEN_AUDIT")}
              </Button>
            </Space>
          </Col>
          <Col span={24}>
            <Typography.Text type="secondary">
              {t("ACK_SLA_EFFECTIVE_TITLE")}
            </Typography.Text>
            {effectiveAcknowledgementSLASettings.length === 0 ? (
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                {t("ACK_SLA_EFFECTIVE_EMPTY")}
              </Typography.Paragraph>
            ) : (
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                {effectiveAcknowledgementSLASettings.map((setting) => (
                  <Typography.Paragraph
                    key={setting.adapter}
                    style={{ marginBottom: 0 }}
                  >
                    {setting.adapter}: {setting.warningMinutes}/
                    {setting.criticalMinutes} (
                    {setting.source === "override"
                      ? t("ACK_SLA_SOURCE_OVERRIDE")
                      : t("ACK_SLA_SOURCE_DEFAULT")}
                    )
                  </Typography.Paragraph>
                ))}
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      <Card title={t("STREAMS_TABLE_TITLE")} style={{ marginBottom: 16 }}>
        <Table
          rowKey={(record: Record<string, any>) =>
            `${record.adapter}:${record.stream}:${record.updatedAt || ""}`
          }
          columns={columns}
          dataSource={sortedStreams}
          pagination={false}
          locale={{ emptyText: t("EMPTY") }}
        />
      </Card>

      <Card title={t("TRIAGE_SUMMARY_TITLE")} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("TRIAGE_UNHEALTHY")}: {triageSummary.unhealthy}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("TRIAGE_HEALTHY")}: {triageSummary.healthy}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("TRIAGE_LAG")}: {triageSummary.lag}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("TRIAGE_GAP")}: {triageSummary.gap}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("TRIAGE_DUPLICATE")}: {triageSummary.duplicate}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("TRIAGE_ERROR")}: {triageSummary.error}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("TRIAGE_ACKNOWLEDGED")}: {activeAcknowledgementsCount}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("TRIAGE_RESOLVED")}: {resolvedAcknowledgementsCount}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("TRIAGE_ACK_STALE")}: {staleAcknowledgementsCount}
            </Typography.Paragraph>
          </Col>
        </Row>
      </Card>

      <VerificationReviewPanel />

      <CashierReviewPanel />

      <Card title={t("ACK_FORM_TITLE")} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Select
              value={selectedAckStreamKey || undefined}
              onChange={(value) =>
                setAckForm((previous) => ({
                  ...previous,
                  streamKey: `${value || ""}`,
                }))
              }
              placeholder={t("ACK_FIELD_STREAM")}
              style={{ width: "100%" }}
            >
              {sortedStreams.map((stream) => {
                const streamKey = buildStreamKey(stream);
                return (
                  <Select.Option key={streamKey} value={streamKey}>
                    {stream.adapter}/{stream.stream}
                  </Select.Option>
                );
              })}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Select
              value={ackForm.action}
              onChange={(value: ProviderAcknowledgementAction) =>
                setAckForm((previous) => ({
                  ...previous,
                  action: value,
                }))
              }
              placeholder={t("ACK_FIELD_ACTION")}
              style={{ width: "100%" }}
            >
              <Select.Option value="acknowledge">
                {t("ACK_ACTION_ACKNOWLEDGE")}
              </Select.Option>
              <Select.Option value="reassign">
                {t("ACK_ACTION_REASSIGN")}
              </Select.Option>
              <Select.Option value="resolve">
                {t("ACK_ACTION_RESOLVE")}
              </Select.Option>
              <Select.Option value="reopen">
                {t("ACK_ACTION_REOPEN")}
              </Select.Option>
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Input
              value={ackForm.operator}
              onChange={(event) =>
                setAckForm((previous) => ({
                  ...previous,
                  operator: event.target.value,
                }))
              }
              placeholder={t("ACK_FIELD_OPERATOR")}
            />
          </Col>
          <Col xs={24} md={6}>
            <Input
              value={ackForm.note}
              onChange={(event) =>
                setAckForm((previous) => ({
                  ...previous,
                  note: event.target.value,
                }))
              }
              placeholder={t("ACK_FIELD_NOTE")}
            />
          </Col>
          <Col span={24}>
            <Space>
              <Button
                type="primary"
                data-testid="provider-ops-ack-submit"
                onClick={submitAcknowledgement}
                loading={acknowledgementUpsertLoading || acknowledgementListLoading}
                disabled={
                  !`${selectedAckStreamKey || ""}`.trim() ||
                  !`${ackForm.operator || ""}`.trim() ||
                  !`${ackForm.note || ""}`.trim()
                }
              >
                {submitLabelForAckAction(ackForm.action)}
              </Button>
              <Button onClick={resetAcknowledgementForm}>
                {t("ACK_ACTION_RESET")}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title={t("MANUAL_CANCEL_TITLE")}> 
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Input
              value={cancelForm.adapter}
              onChange={(event) =>
                setCancelForm((previous) => ({
                  ...previous,
                  adapter: event.target.value,
                }))
              }
              placeholder={t("FIELD_ADAPTER")}
            />
          </Col>
          <Col xs={24} md={12}>
            <Input
              value={cancelForm.playerId}
              onChange={(event) =>
                setCancelForm((previous) => ({
                  ...previous,
                  playerId: event.target.value,
                }))
              }
              placeholder={t("FIELD_PLAYER_ID")}
            />
          </Col>
          <Col xs={24} md={12}>
            <Input
              value={cancelForm.betId}
              onChange={(event) =>
                setCancelForm((previous) => ({
                  ...previous,
                  betId: event.target.value,
                }))
              }
              placeholder={t("FIELD_BET_ID")}
            />
          </Col>
          <Col xs={24} md={12}>
            <Input
              value={cancelForm.requestId}
              onChange={(event) =>
                setCancelForm((previous) => ({
                  ...previous,
                  requestId: event.target.value,
                }))
              }
              placeholder={t("FIELD_REQUEST_ID")}
            />
          </Col>
          <Col span={24}>
            <Input
              value={cancelForm.reason}
              onChange={(event) =>
                setCancelForm((previous) => ({
                  ...previous,
                  reason: event.target.value,
                }))
              }
              placeholder={t("FIELD_REASON")}
            />
          </Col>
          <Col span={24}>
            <Space>
              <Button
                type="primary"
                onClick={submitProviderCancel}
                loading={cancelLoading}
                disabled={
                  !canSubmitProviderCancel(buildProviderCancelPayload(cancelForm))
                }
              >
                {t("ACTION_SUBMIT_CANCEL")}
              </Button>
              <Button onClick={resetCancelForm}>{t("ACTION_RESET_CANCEL")}</Button>
            </Space>
          </Col>
        </Row>

        {lastCancelResult && (
          <Alert
            style={{ marginTop: 16 }}
            type={lastCancelResult.state === "cancelled" ? "success" : "warning"}
            message={t("LAST_CANCEL_RESULT")}
            description={
              <span>
                {t("LAST_CANCEL_STATE")}: {lastCancelResult.state || "-"}
                {" | "}
                {t("LAST_CANCEL_ADAPTER")}: {lastCancelResult.adapter || "-"}
                {" | "}
                {t("LAST_CANCEL_ATTEMPTS")}: {lastCancelResult.attempts || 0}
                {" | "}
                {t("LAST_CANCEL_RETRIES")}: {lastCancelResult.retryCount || 0}
              </span>
            }
            showIcon
          />
        )}
      </Card>

      <Card title={t("BET_INTERVENTION_TITLE")} style={{ marginTop: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input
              value={betInterventionForm.betId}
              onChange={(event) =>
                setBetInterventionForm((previous) => ({
                  ...previous,
                  betId: event.target.value,
                }))
              }
              placeholder={t("BET_FIELD_BET_ID")}
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              value={betInterventionForm.action}
              onChange={(value) =>
                setBetInterventionForm((previous) => ({
                  ...previous,
                  action: value as BetLifecycleAction,
                }))
              }
              style={{ width: "100%" }}
            >
              <Select.Option value="cancel">
                {t("BET_ACTION_CANCEL")}
              </Select.Option>
              <Select.Option value="refund">
                {t("BET_ACTION_REFUND")}
              </Select.Option>
              <Select.Option value="settle" disabled={betIsMultiLeg}>
                {betIsMultiLeg
                  ? `${t("BET_ACTION_SETTLE")} (multi-leg not supported)`
                  : t("BET_ACTION_SETTLE")}
              </Select.Option>
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <Input
              value={betInterventionForm.reason}
              onChange={(event) =>
                setBetInterventionForm((previous) => ({
                  ...previous,
                  reason: event.target.value,
                }))
              }
              placeholder={t("BET_FIELD_REASON")}
            />
          </Col>
          {betInterventionForm.action === "settle" && (
            <>
              <Col xs={24} md={8}>
                <Input
                  value={betInterventionForm.winningSelectionId}
                  onChange={(event) =>
                    setBetInterventionForm((previous) => ({
                      ...previous,
                      winningSelectionId: event.target.value,
                    }))
                  }
                  placeholder={t("BET_FIELD_WINNING_SELECTION_ID")}
                />
              </Col>
              <Col xs={24} md={8}>
                <Input
                  value={betInterventionForm.winningSelectionName}
                  onChange={(event) =>
                    setBetInterventionForm((previous) => ({
                      ...previous,
                      winningSelectionName: event.target.value,
                    }))
                  }
                  placeholder={t("BET_FIELD_WINNING_SELECTION_NAME")}
                />
              </Col>
              <Col xs={24} md={8}>
                <Input
                  value={betInterventionForm.resultSource}
                  onChange={(event) =>
                    setBetInterventionForm((previous) => ({
                      ...previous,
                      resultSource: event.target.value,
                    }))
                  }
                  placeholder={t("BET_FIELD_RESULT_SOURCE")}
                />
              </Col>
            </>
          )}
          <Col span={24}>
            <Space>
              <Button
                type="primary"
                onClick={submitBetIntervention}
                loading={interventionLoading}
                disabled={!canSubmitBetIntervention(betInterventionForm)}
              >
                {t("BET_ACTION_SUBMIT")}
              </Button>
              <Button onClick={resetBetInterventionForm}>
                {t("BET_ACTION_RESET")}
              </Button>
              <Button onClick={openBetAuditLogs}>
                {t("BET_ACTION_OPEN_AUDIT")}
              </Button>
            </Space>
          </Col>
        </Row>
        {lastBetInterventionResult && (
          <Alert
            style={{ marginTop: 16 }}
            type="info"
            message={t("BET_LAST_RESULT")}
            description={
              <span>
                {t("BET_LAST_BET_ID")}:{" "}
                {`${lastBetInterventionResult.betId || betInterventionForm.betId || "-"}`}
                {" | "}
                {t("BET_LAST_STATUS")}: {`${lastBetInterventionResult.status || "-"}`}
              </span>
            }
            showIcon
          />
        )}
      </Card>
    </>
  );
};

export default ProviderOpsContainer;
