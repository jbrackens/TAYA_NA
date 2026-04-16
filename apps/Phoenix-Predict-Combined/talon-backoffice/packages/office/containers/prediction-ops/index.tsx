import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Input, List, Modal, Row, Select, Space, Table, Tag, Typography } from "antd";
import { Method, PunterRoleEnum } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";
import { useRouter } from "next/router";
import PageHeader from "../../components/layout/page-header";
import { useApi } from "../../services/api/api-service";
import { resolveToken, validateAndCheckEligibility } from "../../utils/auth";
import {
  normalizePredictionMarketDetail,
  normalizePredictionLifecycleHistory,
  normalizePredictionMarkets,
  normalizePredictionOrders,
  normalizePredictionSummary,
  PredictionLifecycleAction,
  PredictionLifecycleHistoryItem,
  PredictionLifecycleHistoryResponse,
  PredictionOrder,
  PredictionAdminSummary,
  PredictionMarket,
  PredictionMarketDetailResponse,
  PredictionMarketsResponse,
  PredictionOrdersResponse,
} from "./contracts";
import PredictionOpsExportButton from "./export";

const formatUsd = (value: number) =>
  `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const formatTimestamp = (value?: string) =>
  value ? new Date(value).toLocaleString() : "-";

const resolveStatusColor = (status: string) => {
  switch (`${status || ""}`.toLowerCase()) {
    case "live":
      return "red";
    case "won":
      return "green";
    case "lost":
      return "volcano";
    case "suspended":
      return "gold";
    case "cancelled":
      return "default";
    case "open":
      return "processing";
    case "resolved":
      return "default";
    case "resettled":
      return "purple";
    default:
      return "blue";
  }
};

const lifecycleActionLabel = (
  t: (key: string) => string,
  action: PredictionLifecycleAction,
) => {
  switch (action) {
    case "suspend":
      return t("ACTION_SUSPEND");
    case "open":
      return t("ACTION_OPEN");
    case "cancel":
      return t("ACTION_CANCEL");
    case "resolve":
      return t("ACTION_RESOLVE");
    case "resettle":
      return t("ACTION_RESETTLE");
  }
};

const getLifecycleActions = (market: PredictionMarket): PredictionLifecycleAction[] => {
  switch (`${market.status || ""}`.toLowerCase()) {
    case "open":
    case "live":
      return ["suspend", "resolve", "cancel"];
    case "suspended":
      return ["open", "resolve", "cancel"];
    case "resolved":
      return ["resettle"];
    default:
      return [];
  }
};

type PredictionOpsContainerProps = {
  marketId?: string;
};

type PredictionAuditLogEntry = {
  id?: string;
  action?: string;
  actorId?: string;
  occurredAt?: string;
  createdAt?: string;
  details?: string;
};

type PredictionAuditLogListResponse = {
  data?: PredictionAuditLogEntry[];
};

const PredictionOpsContainer = ({ marketId }: PredictionOpsContainerProps) => {
  const { t } = useTranslation("page-prediction-ops");
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ category: "", status: "" });
  const [summary, setSummary] = useState<PredictionAdminSummary>(
    normalizePredictionSummary(),
  );
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [orders, setOrders] = useState<PredictionOrder[]>([]);
  const [detail, setDetail] = useState<PredictionMarketDetailResponse | null>(null);
  const [lifecycleHistory, setLifecycleHistory] = useState<PredictionLifecycleHistoryItem[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<PredictionAuditLogEntry[]>([]);
  const [lifecycleVisible, setLifecycleVisible] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<PredictionLifecycleAction | null>(null);
  const [lifecycleMarket, setLifecycleMarket] = useState<PredictionMarket | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleOutcomeId, setLifecycleOutcomeId] = useState("");
  const [lifecycleConfirmation, setLifecycleConfirmation] = useState("");
  const [openOrderPreviewCount, setOpenOrderPreviewCount] = useState(0);

  const canManagePredictionMarketState = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [
      PunterRoleEnum.ADMIN,
      PunterRoleEnum.TRADER,
    ]);
  }, []);
  const canManagePredictionReversibleState = canManagePredictionMarketState;
  const canManagePredictionDestructiveOverrides = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [PunterRoleEnum.ADMIN]);
  }, []);
  const canManagePredictionSettlement = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [PunterRoleEnum.ADMIN]);
  }, []);
  const canViewPredictionOrderFlow = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [
      PunterRoleEnum.ADMIN,
      PunterRoleEnum.TRADER,
    ]);
  }, []);
  const canViewPredictionOps = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [
      PunterRoleEnum.ADMIN,
      PunterRoleEnum.TRADER,
      PunterRoleEnum.OPERATOR,
    ]);
  }, []);
  const canViewPredictionAuditTrail = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [
      PunterRoleEnum.ADMIN,
      PunterRoleEnum.TRADER,
    ]);
  }, []);
  const canExportPredictionMarkets = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [
      PunterRoleEnum.ADMIN,
      PunterRoleEnum.TRADER,
    ]);
  }, []);
  const canExportPredictionOrders = canViewPredictionOrderFlow;
  const canOpenAuditLogs = canViewPredictionAuditTrail;

  const canManageLifecycleAction = (action: PredictionLifecycleAction) =>
    action === "suspend" || action === "open"
      ? canManagePredictionReversibleState
      : action === "cancel"
        ? canManagePredictionDestructiveOverrides
        : canManagePredictionSettlement;

  const lifecycleDisabledTitle = (action: PredictionLifecycleAction) =>
    action === "suspend" || action === "open"
      ? t("LIFECYCLE_DISABLED_STATE_ROLE")
      : action === "cancel"
        ? t("LIFECYCLE_DISABLED_OVERRIDE_ADMIN_ONLY")
        : t("LIFECYCLE_DISABLED_SETTLEMENT_ADMIN_ONLY");

  const [triggerSummary, summaryLoading, summaryResponse] =
    useApi<PredictionAdminSummary>("admin/prediction/summary", Method.GET);
  const [triggerMarkets, marketsLoading, marketsResponse] =
    useApi<PredictionMarketsResponse>("admin/prediction/markets", Method.GET);
  const [triggerOrders, ordersLoading, ordersResponse] =
    useApi<PredictionOrdersResponse>("admin/prediction/orders", Method.GET);
  const [triggerDetail, detailLoading, detailResponse] =
    useApi<PredictionMarketDetailResponse>("admin/prediction/markets/:id", Method.GET);
  const [triggerLifecycleHistory, lifecycleHistoryLoading, lifecycleHistoryResponse] =
    useApi<PredictionLifecycleHistoryResponse>("admin/prediction/markets/:id/lifecycle", Method.GET);
  const [triggerLifecycle, lifecycleLoading] =
    useApi<PredictionMarketDetailResponse>("admin/prediction/markets/:id/lifecycle/:action", Method.POST);
  const [triggerOpenOrdersPreview, openOrdersPreviewLoading, openOrdersPreviewResponse] =
    useApi<PredictionOrdersResponse>("admin/prediction/orders", Method.GET);
  const [triggerAuditLogs, auditLogsLoading, auditLogsResponse] =
    useApi<PredictionAuditLogListResponse>("admin/audit-logs", Method.GET);

  useEffect(() => {
    void triggerSummary();
  }, [triggerSummary]);

  useEffect(() => {
    void triggerMarkets(undefined, {
      query: {
        ...(appliedFilters.category ? { category: appliedFilters.category } : {}),
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
      },
    });
    if (!canViewPredictionOrderFlow) {
      setOrders([]);
      return;
    }
    void triggerOrders(undefined, {
      query: {
        ...(appliedFilters.category ? { category: appliedFilters.category } : {}),
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
        ...(marketId ? { marketId } : {}),
      },
    });
  }, [appliedFilters, canViewPredictionOrderFlow, marketId, triggerMarkets, triggerOrders]);

  useEffect(() => {
    if (!marketId) {
      setDetail(null);
      setLifecycleHistory([]);
      setRecentAuditLogs([]);
      return;
    }
    void triggerDetail(undefined, { id: marketId });
    void triggerLifecycleHistory(undefined, { id: marketId });
    void triggerAuditLogs(undefined, {
      query: {
        product: "prediction",
        targetId: marketId,
        page: 1,
        pageSize: 5,
        sortBy: "occurredAt",
        sortDir: "desc",
      },
    });
  }, [marketId, triggerAuditLogs, triggerDetail, triggerLifecycleHistory]);

  useEffect(() => {
    if (summaryResponse.succeeded) {
      setSummary(normalizePredictionSummary(summaryResponse.data));
    }
  }, [summaryResponse.succeeded, summaryResponse.data]);

  useEffect(() => {
    if (marketsResponse.succeeded) {
      setMarkets(normalizePredictionMarkets(marketsResponse.data).markets);
    }
  }, [marketsResponse.succeeded, marketsResponse.data]);

  useEffect(() => {
    if (ordersResponse.succeeded) {
      setOrders(normalizePredictionOrders(ordersResponse.data).orders);
    }
  }, [ordersResponse.succeeded, ordersResponse.data]);

  useEffect(() => {
    if (detailResponse.succeeded) {
      setDetail(normalizePredictionMarketDetail(detailResponse.data));
    }
  }, [detailResponse.succeeded, detailResponse.data]);

  useEffect(() => {
    if (lifecycleHistoryResponse.succeeded) {
      setLifecycleHistory(
        normalizePredictionLifecycleHistory(lifecycleHistoryResponse.data).items,
      );
    }
  }, [lifecycleHistoryResponse.succeeded, lifecycleHistoryResponse.data]);

  useEffect(() => {
    if (openOrdersPreviewResponse.succeeded) {
      setOpenOrderPreviewCount(
        normalizePredictionOrders(openOrdersPreviewResponse.data).totalCount,
      );
    }
  }, [openOrdersPreviewResponse.succeeded, openOrdersPreviewResponse.data]);

  useEffect(() => {
    if (!auditLogsResponse.succeeded) {
      return;
    }
    setRecentAuditLogs(Array.isArray(auditLogsResponse.data?.data) ? auditLogsResponse.data?.data || [] : []);
  }, [auditLogsResponse.succeeded, auditLogsResponse.data]);

  const openMarket = (id: string) => router.push(`/risk-management/prediction/${id}`);
  const openAuditLogsForMarket = (id: string, action?: string) => {
    if (!canOpenAuditLogs) {
      return;
    }
    void router.push({
      pathname: "/logs",
      query: {
        product: "prediction",
        targetId: id,
        ...(action ? { action } : {}),
        p: 1,
        limit: 20,
      },
    });
  };
  const refreshData = async (focusMarketId?: string) => {
    await Promise.all([
      triggerSummary(),
      triggerMarkets(undefined, {
        query: {
          ...(appliedFilters.category ? { category: appliedFilters.category } : {}),
          ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
        },
      }),
      ...(canViewPredictionOrderFlow
        ? [
            triggerOrders(undefined, {
              query: {
                ...(appliedFilters.category ? { category: appliedFilters.category } : {}),
                ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
                ...(focusMarketId || marketId ? { marketId: focusMarketId || marketId } : {}),
              },
            }),
          ]
        : []),
    ]);

    if (focusMarketId || marketId) {
      await Promise.all([
        triggerDetail(undefined, { id: focusMarketId || marketId }),
        triggerLifecycleHistory(undefined, { id: focusMarketId || marketId }),
        triggerAuditLogs(undefined, {
          query: {
            product: "prediction",
            targetId: focusMarketId || marketId,
            page: 1,
            pageSize: 5,
            sortBy: "occurredAt",
            sortDir: "desc",
          },
        }),
      ]);
    }
  };

  const loadLifecycleContext = async (
    market: PredictionMarket,
    action: PredictionLifecycleAction,
  ) => {
    await Promise.all([
      triggerLifecycleHistory(undefined, { id: market.marketId }),
      triggerOpenOrdersPreview(undefined, {
        query: {
          marketId: market.marketId,
          ...((`${action || ""}`.toLowerCase() === "resettle")
            ? {}
            : { status: "open" }),
        },
      }),
    ]);
  };

  const openLifecycleModal = async (action: PredictionLifecycleAction, market: PredictionMarket) => {
    if (!canManageLifecycleAction(action)) {
      return;
    }
    setLifecycleAction(action);
    setLifecycleMarket(market);
    setLifecycleReason("");
    setLifecycleOutcomeId(market.outcomes[0]?.outcomeId || "");
    setLifecycleConfirmation("");
    setOpenOrderPreviewCount(0);
    setLifecycleVisible(true);
    await loadLifecycleContext(market, action);
  };

  const closeLifecycleModal = () => {
    setLifecycleVisible(false);
    setLifecycleAction(null);
    setLifecycleMarket(null);
    setLifecycleReason("");
    setLifecycleOutcomeId("");
    setLifecycleConfirmation("");
    setOpenOrderPreviewCount(0);
  };

  const submitLifecycle = async () => {
    if (!lifecycleAction || !lifecycleMarket || !canManageLifecycleAction(lifecycleAction)) {
      return;
    }
    if ((lifecycleAction === "resolve" || lifecycleAction === "resettle") && !`${lifecycleOutcomeId || ""}`.trim()) {
      return;
    }

    await triggerLifecycle(
      {
        reason: `${lifecycleReason || ""}`.trim() || `manual ${lifecycleAction}`,
        ...((lifecycleAction === "resolve" || lifecycleAction === "resettle")
          ? { outcomeId: lifecycleOutcomeId }
          : {}),
      },
      {
        id: lifecycleMarket.marketId,
        action: lifecycleAction,
      },
    );

    closeLifecycleModal();
    await refreshData(lifecycleMarket.marketId);
  };

  const confirmationToken = (lifecycleAction &&
    (lifecycleAction === "resolve" || lifecycleAction === "cancel" || lifecycleAction === "resettle"))
    ? lifecycleAction.toUpperCase()
    : "";

  const requiresExplicitConfirmation = Boolean(confirmationToken);
  const canSubmitLifecycle = Boolean(
      lifecycleAction &&
      lifecycleMarket &&
      canManageLifecycleAction(lifecycleAction) &&
      `${lifecycleReason || ""}`.trim().length >= 5 &&
      (
        (lifecycleAction !== "resolve" && lifecycleAction !== "resettle") ||
        `${lifecycleOutcomeId || ""}`.trim()
      ) &&
      (!requiresExplicitConfirmation ||
        `${lifecycleConfirmation || ""}`.trim().toUpperCase() === confirmationToken),
  );

  const categoryOptions = useMemo(
    () => summary.categories.map((category) => ({ label: category.label, value: category.key })),
    [summary.categories],
  );

  const marketColumns = [
    {
      title: t("TABLE_MARKET"),
      dataIndex: "title",
      key: "title",
      render: (_: string, record: PredictionMarket) => (
        <Button type="link" onClick={() => openMarket(record.marketId)} style={{ padding: 0 }}>
          {record.title}
        </Button>
      ),
    },
    { title: t("TABLE_CATEGORY"), dataIndex: "categoryLabel", key: "categoryLabel" },
    {
      title: t("TABLE_STATUS"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => <Tag color={resolveStatusColor(status)}>{status.toUpperCase()}</Tag>,
    },
    { title: t("TABLE_VOLUME"), dataIndex: "volumeUsd", key: "volumeUsd", render: formatUsd },
    { title: t("TABLE_LIQUIDITY"), dataIndex: "liquidityUsd", key: "liquidityUsd", render: formatUsd },
    { title: t("TABLE_PARTICIPANTS"), dataIndex: "participants", key: "participants" },
    {
      title: t("TABLE_ACTIONS"),
      key: "actions",
      render: (_: string, record: PredictionMarket) => (
        <Space size="small" wrap>
          {getLifecycleActions(record).map((action) => (
            <Button
              key={`${record.marketId}-${action}`}
              size="small"
              disabled={!canManageLifecycleAction(action)}
              title={!canManageLifecycleAction(action) ? lifecycleDisabledTitle(action) : ""}
              onClick={() => openLifecycleModal(action, record)}
            >
              {lifecycleActionLabel(t, action)}
            </Button>
          ))}
          <Button
            size="small"
            disabled={!canOpenAuditLogs}
            title={!canOpenAuditLogs ? t("AUDIT_LINK_ADMIN_ONLY") : ""}
            onClick={() => openAuditLogsForMarket(record.marketId)}
          >
            {t("ACTION_VIEW_AUDIT")}
          </Button>
        </Space>
      ),
    },
  ];

  const orderColumns = [
    {
      title: t("ORDERS_TABLE_ORDER"),
      dataIndex: "orderId",
      key: "orderId",
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    { title: t("ORDERS_TABLE_PUNTER"), dataIndex: "punterId", key: "punterId" },
    { title: t("ORDERS_TABLE_MARKET"), dataIndex: "marketTitle", key: "marketTitle" },
    { title: t("ORDERS_TABLE_OUTCOME"), dataIndex: "outcomeLabel", key: "outcomeLabel" },
    {
      title: t("ORDERS_TABLE_STATUS"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => <Tag color={resolveStatusColor(status)}>{status.toUpperCase()}</Tag>,
    },
    {
      title: t("ORDERS_TABLE_SETTLEMENT"),
      key: "settlement",
      render: (_: unknown, order: PredictionOrder) => (
        <Space direction="vertical" size={0}>
          {order.marketStatus ? (
            <Typography.Text type="secondary">
              {t("EXPORT_COLUMN_MARKET_STATUS")}: {order.marketStatus}
            </Typography.Text>
          ) : null}
          {order.winningOutcomeLabel ? (
            <Typography.Text type="secondary">
              {t("EXPORT_COLUMN_WINNING_OUTCOME")}: {order.winningOutcomeLabel}
            </Typography.Text>
          ) : null}
          {order.settledAt ? (
            <Typography.Text type="secondary">
              {t("EXPORT_COLUMN_SETTLED_AT")}: {formatTimestamp(order.settledAt)}
            </Typography.Text>
          ) : null}
          {order.previousSettlementStatus ? (
            <Typography.Text type="secondary">
              {t("EXPORT_COLUMN_PREVIOUS_SETTLEMENT_STATUS")}: {order.previousSettlementStatus}
            </Typography.Text>
          ) : null}
          {order.previousSettledAt ? (
            <Typography.Text type="secondary">
              {t("EXPORT_COLUMN_PREVIOUS_SETTLED_AT")}: {formatTimestamp(order.previousSettledAt)}
            </Typography.Text>
          ) : null}
          {order.previousSettledAmountUsd !== undefined ? (
            <Typography.Text type="secondary">
              {t("EXPORT_COLUMN_PREVIOUS_SETTLED_AMOUNT")}: ${Number(order.previousSettledAmountUsd || 0).toFixed(2)}
            </Typography.Text>
          ) : null}
          {order.settlementReason ? (
            <Typography.Text type="secondary">
              {t("EXPORT_COLUMN_SETTLEMENT_REASON")}: {order.settlementReason}
            </Typography.Text>
          ) : null}
          {order.settlementActor ? (
            <Typography.Text type="secondary">
              {t("EXPORT_COLUMN_SETTLEMENT_ACTOR")}: {order.settlementActor}
            </Typography.Text>
          ) : null}
          {!order.marketStatus &&
          !order.winningOutcomeLabel &&
          !order.settledAt &&
          !order.previousSettlementStatus &&
          !order.previousSettledAt &&
          order.previousSettledAmountUsd === undefined &&
          !order.settlementReason &&
          !order.settlementActor ? (
            <Typography.Text type="secondary">-</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: t("ORDERS_TABLE_STAKE"),
      dataIndex: "stakeUsd",
      key: "stakeUsd",
      render: (value: number) => `$${Number(value || 0).toFixed(2)}`,
    },
    {
      title: t("ORDERS_TABLE_CREATED"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => formatTimestamp(value),
    },
  ];

  return (
    <>
      <PageHeader title={t("HEADER")} backIcon={Boolean(marketId)} />
      {canViewPredictionOps && !canManagePredictionSettlement && (
        <div style={{ marginBottom: 12 }}>
          <Alert
            type={canManagePredictionMarketState ? "info" : "warning"}
            showIcon
            message={
              canManagePredictionMarketState
                ? t("TRADER_LIMITED_WARNING")
                : t("READ_ONLY_WARNING")
            }
            description={
              canManagePredictionMarketState
                ? t("TRADER_LIMITED_WARNING_DETAIL")
                : t("READ_ONLY_WARNING_DETAIL")
            }
          />
        </div>
      )}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} xl={6}><Card loading={summaryLoading} title={t("CARD_TOTAL_MARKETS")}>{summary.totalMarkets}</Card></Col>
            <Col xs={24} md={12} xl={6}><Card loading={summaryLoading} title={t("CARD_LIVE_MARKETS")}>{summary.liveMarkets}</Card></Col>
            <Col xs={24} md={12} xl={6}><Card loading={summaryLoading} title={t("CARD_FEATURED_MARKETS")}>{summary.featuredMarkets}</Card></Col>
            <Col xs={24} md={12} xl={6}><Card loading={summaryLoading} title={t("CARD_TOTAL_VOLUME")}>{formatUsd(summary.totalVolumeUsd)}</Card></Col>
            <Col xs={24} md={12} xl={6}><Card loading={summaryLoading} title={t("CARD_TOTAL_ORDERS")}>{summary.totalOrders}</Card></Col>
            <Col xs={24} md={12} xl={6}><Card loading={summaryLoading} title={t("CARD_OPEN_ORDERS")}>{summary.openOrders}</Card></Col>
          </Row>
        </Col>
        <Col span={24}>
          <Card title={t("FILTERS_TITLE")}>
            <Space wrap>
              <Input
                placeholder={t("FILTER_CATEGORY_PLACEHOLDER")}
                value={categoryFilter}
                list="prediction-category-list"
                onChange={(event) => setCategoryFilter(event.target.value)}
                style={{ width: 220 }}
              />
              <datalist id="prediction-category-list">
                {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </datalist>
              <Input
                placeholder={t("FILTER_STATUS_PLACEHOLDER")}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={{ width: 180 }}
              />
              <Button type="primary" onClick={() => setAppliedFilters({ category: categoryFilter.trim(), status: statusFilter.trim() })}>{t("FILTER_APPLY")}</Button>
              <Button onClick={() => { setCategoryFilter(""); setStatusFilter(""); setAppliedFilters({ category: "", status: "" }); }}>{t("FILTER_RESET")}</Button>
            </Space>
          </Card>
        </Col>
        {detail ? (
          <Col span={24}>
            <Card
              loading={detailLoading}
              title={detail.market.title}
              extra={
                <Space wrap>
                  <Tag color={resolveStatusColor(detail.market.status)}>
                    {detail.market.status.toUpperCase()}
                  </Tag>
                  <Button
                    size="small"
                    disabled={!canOpenAuditLogs}
                    title={!canOpenAuditLogs ? t("AUDIT_LINK_ADMIN_ONLY") : ""}
                    onClick={() => openAuditLogsForMarket(detail.market.marketId)}
                  >
                    {t("DETAIL_AUDIT_OPEN")}
                  </Button>
                  {getLifecycleActions(detail.market).map((action) => (
                    <Button
                      key={`detail-${detail.market.marketId}-${action}`}
                      size="small"
                      disabled={!canManageLifecycleAction(action)}
                      title={!canManageLifecycleAction(action) ? lifecycleDisabledTitle(action) : ""}
                      onClick={() => openLifecycleModal(action, detail.market)}
                    >
                      {lifecycleActionLabel(t, action)}
                    </Button>
                  ))}
                </Space>
              }
            >
              <Typography.Paragraph>{detail.market.summary}</Typography.Paragraph>
              <Typography.Paragraph type="secondary">{detail.market.insight}</Typography.Paragraph>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}><Card size="small" title={t("DETAIL_VOLUME")}>{formatUsd(detail.market.volumeUsd)}</Card></Col>
                <Col xs={24} md={8}><Card size="small" title={t("DETAIL_LIQUIDITY")}>{formatUsd(detail.market.liquidityUsd)}</Card></Col>
                <Col xs={24} md={8}><Card size="small" title={t("DETAIL_RESOLUTION_SOURCE")}>{detail.market.resolutionSource}</Card></Col>
              </Row>
              <Typography.Title level={5} style={{ marginTop: 16 }}>{t("DETAIL_OUTCOMES")}</Typography.Title>
              <Space wrap>
                {detail.market.outcomes.map((outcome) => <Tag key={outcome.outcomeId}>{outcome.label}: {outcome.priceCents}c</Tag>)}
              </Space>
              <Typography.Title level={5} style={{ marginTop: 16 }}>{t("DETAIL_RULES")}</Typography.Title>
              <ul>{detail.market.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
              <Typography.Title level={5} style={{ marginTop: 16 }}>{t("DETAIL_ORDERS")}</Typography.Title>
              {canViewPredictionOrderFlow ? (
                <Table
                  rowKey="orderId"
                  loading={ordersLoading}
                  columns={orderColumns}
                  dataSource={orders.filter((order) => order.marketId === detail.market.marketId)}
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                />
              ) : (
                <Alert type="info" showIcon message={t("ORDER_FLOW_TRADER_ONLY")} />
              )}
              <Typography.Title level={5} style={{ marginTop: 16 }}>{t("DETAIL_LIFECYCLE_HISTORY")}</Typography.Title>
              <Table
                rowKey="id"
                loading={lifecycleHistoryLoading}
                dataSource={lifecycleHistory}
                pagination={{ pageSize: 5, hideOnSinglePage: true }}
                columns={[
                  {
                    title: t("LIFECYCLE_HISTORY_TIME"),
                    dataIndex: "performedAt",
                    key: "performedAt",
                    render: (value: string) => formatTimestamp(value),
                  },
                  {
                    title: t("LIFECYCLE_HISTORY_ACTION"),
                    dataIndex: "action",
                    key: "action",
                    render: (value: string) => lifecycleActionLabel(t, value as PredictionLifecycleAction),
                  },
                  {
                    title: t("LIFECYCLE_HISTORY_ACTOR"),
                    dataIndex: "performedBy",
                    key: "performedBy",
                  },
                  {
                    title: t("LIFECYCLE_HISTORY_TRANSITION"),
                    key: "transition",
                    render: (_: string, record: PredictionLifecycleHistoryItem) =>
                      `${record.marketStatusBefore} -> ${record.marketStatusAfter}`,
                  },
                  {
                    title: t("LIFECYCLE_HISTORY_REASON"),
                    dataIndex: "reason",
                    key: "reason",
                  },
                ]}
              />
              <Typography.Title level={5} style={{ marginTop: 16 }}>
                {t("DETAIL_AUDIT_TRAIL")}
              </Typography.Title>
              <List
                size="small"
                loading={auditLogsLoading}
                dataSource={recentAuditLogs}
                locale={{ emptyText: t("AUDIT_HISTORY_EMPTY") }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key={`${item.id || item.occurredAt || "audit"}-open`}
                        type="link"
                        disabled={!canOpenAuditLogs}
                        onClick={() =>
                          openAuditLogsForMarket(
                            detail.market.marketId,
                            `${item.action || ""}`.trim() || undefined,
                          )
                        }
                      >
                        {t("ACTION_VIEW_AUDIT")}
                      </Button>,
                    ]}
                  >
                    <Space direction="vertical" size={0}>
                      <Typography.Text strong>{item.action || t("ACTION_VIEW_AUDIT")}</Typography.Text>
                      <Typography.Text type="secondary">
                        {formatTimestamp(item.occurredAt || item.createdAt)}
                      </Typography.Text>
                      <Typography.Text>{item.details || "-"}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        ) : null}
        <Col span={24}>
          <Card
            title={t("TABLE_TITLE")}
            extra={
              <PredictionOpsExportButton
                kind="markets"
                markets={markets}
                disabled={!canExportPredictionMarkets}
              />
            }
          >
            <Table
              rowKey="marketId"
              loading={marketsLoading}
              columns={marketColumns}
              dataSource={markets}
              pagination={{ pageSize: 20, hideOnSinglePage: true }}
            />
          </Card>
        </Col>
        {canViewPredictionOrderFlow ? (
          <Col span={24}>
            <Card
              title={t("ORDERS_TABLE_TITLE")}
              extra={
                <PredictionOpsExportButton
                  kind="orders"
                  orders={orders}
                  disabled={!canExportPredictionOrders}
                />
              }
            >
              <Table
                rowKey="orderId"
                loading={ordersLoading}
                columns={orderColumns}
                dataSource={orders}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
              />
            </Card>
          </Col>
        ) : null}
      </Row>
      <Modal
        visible={lifecycleVisible}
        title={
          lifecycleAction && lifecycleMarket
            ? `${lifecycleActionLabel(t, lifecycleAction)}: ${lifecycleMarket.shortTitle}`
            : t("LIFECYCLE_MODAL_TITLE")
        }
        onCancel={closeLifecycleModal}
        onOk={submitLifecycle}
        confirmLoading={lifecycleLoading}
        okButtonProps={{ disabled: !canSubmitLifecycle }}
        okText={lifecycleAction ? lifecycleActionLabel(t, lifecycleAction) : t("ACTION_SUBMIT")}
      >
        {requiresExplicitConfirmation ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={t("LIFECYCLE_WARNING_TITLE")}
            description={
              openOrdersPreviewLoading
                ? t("LIFECYCLE_LOADING_ORDERS")
                : `${t("LIFECYCLE_WARNING_DESCRIPTION_PREFIX")} ${openOrderPreviewCount}. ${t(
                    "LIFECYCLE_WARNING_DESCRIPTION_SUFFIX",
                    { action: lifecycleAction?.toUpperCase() || "" },
                  )}`
            }
          />
        ) : (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={t("LIFECYCLE_INFO_TITLE")}
            description={
              openOrdersPreviewLoading
                ? t("LIFECYCLE_LOADING_ORDERS")
                : `${t("LIFECYCLE_INFO_DESCRIPTION_PREFIX")} ${openOrderPreviewCount}.`
            }
          />
        )}
        {(lifecycleAction === "resolve" || lifecycleAction === "resettle") && lifecycleMarket ? (
          <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
            <Typography.Text>{t("LIFECYCLE_OUTCOME_LABEL")}</Typography.Text>
            <Select
              value={lifecycleOutcomeId || undefined}
              onChange={setLifecycleOutcomeId}
              style={{ width: "100%" }}
            >
              {lifecycleMarket.outcomes.map((outcome) => (
                <Select.Option key={outcome.outcomeId} value={outcome.outcomeId}>
                  {outcome.label}
                </Select.Option>
              ))}
            </Select>
          </Space>
        ) : null}
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>{t("LIFECYCLE_REASON_LABEL")}</Typography.Text>
          <Input.TextArea
            rows={4}
            value={lifecycleReason}
            onChange={(event) => setLifecycleReason(event.target.value)}
            placeholder={t("LIFECYCLE_REASON_PLACEHOLDER")}
          />
        </Space>
        {requiresExplicitConfirmation ? (
          <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
            <Typography.Text>
              {t("LIFECYCLE_CONFIRMATION_LABEL", { token: confirmationToken })}
            </Typography.Text>
            <Input
              value={lifecycleConfirmation}
              onChange={(event) => setLifecycleConfirmation(event.target.value)}
              placeholder={confirmationToken}
            />
          </Space>
        ) : null}
        <Typography.Title level={5} style={{ marginTop: 16 }}>
          {t("LIFECYCLE_MODAL_RECENT_HISTORY")}
        </Typography.Title>
        <List
          size="small"
          loading={lifecycleHistoryLoading}
          dataSource={lifecycleHistory.slice(0, 3)}
          locale={{ emptyText: t("LIFECYCLE_HISTORY_EMPTY") }}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={0}>
                <Typography.Text strong>
                  {lifecycleActionLabel(t, item.action)} · {new Date(item.performedAt).toLocaleString()}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {item.performedBy} · {item.marketStatusBefore} {"->"} {item.marketStatusAfter}
                </Typography.Text>
                <Typography.Text>{item.reason}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
};

export default PredictionOpsContainer;
