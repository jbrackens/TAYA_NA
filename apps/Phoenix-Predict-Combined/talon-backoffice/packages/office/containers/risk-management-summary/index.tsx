import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  InputNumber,
  Row,
  Space,
  Typography,
} from "antd";
import { Method, PunterRoleEnum } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";
import { useRouter } from "next/router";
import PageHeader from "../../components/layout/page-header";
import Table from "../../components/layout/table";
import { useApi } from "../../services/api/api-service";
import {
  buildPromoUsageQuery,
  DEFAULT_BREAKDOWN_LIMIT,
  normalizeRiskPlayerScore,
  normalizeRiskSegmentsResponse,
  normalizePromoUsageResponse,
  normalizeWalletCorrectionResponse,
  normalizeDailyReportsResponse,
  parsePromoUsageFiltersFromQuery,
  PromoUsageFilters,
  RiskPlayerScore,
  RiskSegmentsResponse,
  PromoUsageResponse,
  WalletCorrectionResponse,
  DailyReportsResponse,
  resetPromoUsageFilters,
} from "./contracts";
import {
  normalizePredictionSummary,
  PredictionAdminSummary,
} from "../prediction-ops/contracts";
import RiskManagementPredictionExportButton from "./export";
import { resolveToken, validateAndCheckEligibility } from "../../utils/auth";

const formatUsd = (value: number) =>
  `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const downloadCsv = (filename: string, content: any) => {
  const url = window.URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const RiskManagementSummaryContainer = () => {
  const { t } = useTranslation("page-risk-management-summary");
  const router = useRouter();
  const queryFilters = useMemo(
    () => parsePromoUsageFiltersFromQuery(router.query),
    [router.query],
  );
  const [formFilters, setFormFilters] = useState<PromoUsageFilters>(
    queryFilters,
  );
  const [reportDate, setReportDate] = useState("");

  const [triggerPromoUsage, isLoading, promoUsageResponse] =
    useApi<PromoUsageResponse>("admin/promotions/usage", Method.GET);
  const [triggerCorrectionTasks, isCorrectionTasksLoading, correctionTasksResponse] =
    useApi<WalletCorrectionResponse>("admin/wallet/corrections/tasks", Method.GET);
  const [triggerRiskPlayerScore, isRiskPlayerScoreLoading, riskPlayerScoreResponse] =
    useApi<RiskPlayerScore>("admin/risk/player-scores", Method.GET);
  const [triggerRiskSegments, isRiskSegmentsLoading, riskSegmentsResponse] =
    useApi<RiskSegmentsResponse>("admin/risk/segments", Method.GET);
  const [
    triggerPredictionSummary,
    isPredictionSummaryLoading,
    predictionSummaryResponse,
  ] = useApi<PredictionAdminSummary>("admin/prediction/summary", Method.GET);
  const [triggerDailyReport, isDailyReportLoading, dailyReportResponse] =
    useApi<DailyReportsResponse>("admin/reports/daily", Method.POST);
  const [triggerRepeatDailyReport, isRepeatDailyReportLoading, repeatDailyReportResponse] =
    useApi<DailyReportsResponse>("admin/reports/daily/repeat", Method.GET);
  const [triggerExcludedPuntersExport, isExcludedPuntersExportLoading, excludedPuntersExportResponse] =
    useApi<any>("admin/punters/exclusions/export", Method.POST);
  const [triggerUserTransactionsExport, isUserTransactionsExportLoading, userTransactionsExportResponse] =
    useApi<any>("admin/punters/:id/transactions/export", Method.GET);

  const summary = useMemo(
    () =>
      normalizePromoUsageResponse(
        promoUsageResponse.succeeded ? promoUsageResponse.data : undefined,
      ),
    [promoUsageResponse.data, promoUsageResponse.succeeded],
  );
  const correctionTasks = useMemo(
    () =>
      normalizeWalletCorrectionResponse(
        correctionTasksResponse.succeeded
          ? correctionTasksResponse.data
          : undefined,
      ),
    [correctionTasksResponse.data, correctionTasksResponse.succeeded],
  );
  const riskPlayerScore = useMemo(
    () =>
      normalizeRiskPlayerScore(
        riskPlayerScoreResponse.succeeded
          ? riskPlayerScoreResponse.data
          : undefined,
      ),
    [riskPlayerScoreResponse.data, riskPlayerScoreResponse.succeeded],
  );
  const riskSegments = useMemo(
    () =>
      normalizeRiskSegmentsResponse(
        riskSegmentsResponse.succeeded ? riskSegmentsResponse.data : undefined,
      ),
    [riskSegmentsResponse.data, riskSegmentsResponse.succeeded],
  );
  const predictionSummary = useMemo(
    () =>
      normalizePredictionSummary(
        predictionSummaryResponse.succeeded
          ? predictionSummaryResponse.data
          : undefined,
      ),
    [predictionSummaryResponse.data, predictionSummaryResponse.succeeded],
  );
  const dailyReport = useMemo(
    () =>
      normalizeDailyReportsResponse(
        dailyReportResponse.succeeded
          ? dailyReportResponse.data
          : repeatDailyReportResponse.succeeded
            ? repeatDailyReportResponse.data
            : undefined,
      ),
    [
      dailyReportResponse.data,
      dailyReportResponse.succeeded,
      repeatDailyReportResponse.data,
      repeatDailyReportResponse.succeeded,
    ],
  );
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

  useEffect(() => {
    setFormFilters(queryFilters);
  }, [queryFilters]);

  useEffect(() => {
    const fetchPromoUsageSummary = async () => {
      await triggerPromoUsage(undefined, {
        query: buildPromoUsageQuery(queryFilters),
      });
    };

    void fetchPromoUsageSummary();
  }, [queryFilters, triggerPromoUsage]);

  useEffect(() => {
    const fetchCorrectionTasks = async () => {
      await triggerCorrectionTasks(undefined, {
        query: {
          includeScan: "true",
          ...(queryFilters.userId ? { userId: queryFilters.userId } : {}),
          limit: 25,
        },
      });
    };
    void fetchCorrectionTasks();
  }, [queryFilters.userId, triggerCorrectionTasks]);

  useEffect(() => {
    const fetchRiskData = async () => {
      await triggerRiskSegments(undefined, {
        query: {
          ...(queryFilters.userId ? { userId: queryFilters.userId } : {}),
          limit: 20,
        },
      });

      if (queryFilters.userId) {
        await triggerRiskPlayerScore(undefined, {
          query: {
            userId: queryFilters.userId,
          },
        });
      }
    };
    void fetchRiskData();
  }, [queryFilters.userId, triggerRiskPlayerScore, triggerRiskSegments]);

  useEffect(() => {
    void triggerPredictionSummary();
  }, [triggerPredictionSummary]);

  useEffect(() => {
    if (!excludedPuntersExportResponse.succeeded) {
      return;
    }
    downloadCsv("Excluded Punters.csv", excludedPuntersExportResponse.data);
  }, [
    excludedPuntersExportResponse.succeeded,
    excludedPuntersExportResponse.data,
  ]);

  useEffect(() => {
    if (!userTransactionsExportResponse.succeeded || !queryFilters.userId) {
      return;
    }
    downloadCsv(
      `User Transactions - ${queryFilters.userId}.csv`,
      userTransactionsExportResponse.data,
    );
  }, [
    queryFilters.userId,
    userTransactionsExportResponse.succeeded,
    userTransactionsExportResponse.data,
  ]);

  const applyFilters = () => {
    router.push(
      {
        query: buildPromoUsageQuery(formFilters),
      },
      undefined,
      { shallow: true },
    );
  };

  const resetFilters = () => {
    const defaults = resetPromoUsageFilters();
    setFormFilters(defaults);
    router.push(
      {
        query: {
          breakdownLimit: defaults.breakdownLimit,
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const openAuditLogs = () => {
    const query: Record<string, string | number> = {
      action: "bet.placed",
      ...(queryFilters.userId ? { userId: queryFilters.userId } : {}),
      ...(queryFilters.freebetId ? { freebetId: queryFilters.freebetId } : {}),
      ...(queryFilters.oddsBoostId
        ? { oddsBoostId: queryFilters.oddsBoostId }
        : {}),
      p: 1,
      limit: 20,
    };
    router.push({
      pathname: "/logs",
      query,
    });
  };

  const openPredictionAuditLogs = () => {
    if (!canViewPredictionAuditTrail) {
      return;
    }
    router.push({
      pathname: "/logs",
      query: {
        product: "prediction",
        p: 1,
        limit: 20,
      },
    });
  };

  const generateDailyReport = async () => {
    await triggerDailyReport();
  };

  const repeatDailyReport = async () => {
    if (!reportDate.trim()) {
      return;
    }
    await triggerRepeatDailyReport(undefined, {
      query: {
        on: reportDate.trim(),
      },
    });
  };

  const exportExcludedPunters = async () => {
    await triggerExcludedPuntersExport({});
  };

  const exportUserTransactions = async () => {
    if (!queryFilters.userId) {
      return;
    }
    await triggerUserTransactionsExport(undefined, {
      id: queryFilters.userId,
      query: {
        ...(queryFilters.from ? { start_date: queryFilters.from } : {}),
        ...(queryFilters.to ? { end_date: queryFilters.to } : {}),
      },
    });
  };

  const tableColumns = [
    {
      title: t("TABLE_ID"),
      dataIndex: "id",
      key: "id",
      ellipsis: true,
    },
    {
      title: t("TABLE_BET_COUNT"),
      dataIndex: "betCount",
      key: "betCount",
    },
    {
      title: t("TABLE_STAKE_CENTS"),
      dataIndex: "totalStakeCents",
      key: "totalStakeCents",
    },
    {
      title: t("TABLE_FREEBET_APPLIED_CENTS"),
      dataIndex: "totalFreebetAppliedCents",
      key: "totalFreebetAppliedCents",
    },
  ];
  const correctionTaskColumns = [
    {
      title: t("TASK_TABLE_TASK_ID"),
      dataIndex: "taskId",
      key: "taskId",
      ellipsis: true,
    },
    {
      title: t("TASK_TABLE_USER_ID"),
      dataIndex: "userId",
      key: "userId",
    },
    {
      title: t("TASK_TABLE_TYPE"),
      dataIndex: "type",
      key: "type",
    },
    {
      title: t("TASK_TABLE_STATUS"),
      dataIndex: "status",
      key: "status",
    },
    {
      title: t("TASK_TABLE_SUGGESTED_ADJUSTMENT"),
      dataIndex: "suggestedAdjustmentCents",
      key: "suggestedAdjustmentCents",
    },
    {
      title: t("TASK_TABLE_REASON"),
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
    },
  ];
  const riskSegmentColumns = [
    {
      title: t("SEGMENT_TABLE_USER_ID"),
      dataIndex: "userId",
      key: "userId",
    },
    {
      title: t("SEGMENT_TABLE_SEGMENT"),
      dataIndex: "segmentId",
      key: "segmentId",
    },
    {
      title: t("SEGMENT_TABLE_RISK_SCORE"),
      dataIndex: "riskScore",
      key: "riskScore",
    },
    {
      title: t("SEGMENT_TABLE_MANUAL_OVERRIDE"),
      dataIndex: "hasManualOverride",
      key: "hasManualOverride",
      render: (value: boolean) => (value ? t("YES") : t("NO")),
    },
  ];
  const isRiskLoading =
    isCorrectionTasksLoading || isRiskPlayerScoreLoading || isRiskSegmentsLoading;

  return (
    <>
      <PageHeader title={t("HEADER")} backIcon={false} />

      <Card title={t("FILTERS_TITLE")} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={formFilters.userId}
              onChange={(event) =>
                setFormFilters((previous) => ({
                  ...previous,
                  userId: event.target.value,
                }))
              }
              placeholder={t("FILTER_USER_ID_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={formFilters.freebetId}
              onChange={(event) =>
                setFormFilters((previous) => ({
                  ...previous,
                  freebetId: event.target.value,
                }))
              }
              placeholder={t("FILTER_FREEBET_ID_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={formFilters.oddsBoostId}
              onChange={(event) =>
                setFormFilters((previous) => ({
                  ...previous,
                  oddsBoostId: event.target.value,
                }))
              }
              placeholder={t("FILTER_ODDS_BOOST_ID_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={formFilters.from}
              onChange={(event) =>
                setFormFilters((previous) => ({
                  ...previous,
                  from: event.target.value,
                }))
              }
              placeholder={t("FILTER_FROM_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={formFilters.to}
              onChange={(event) =>
                setFormFilters((previous) => ({
                  ...previous,
                  to: event.target.value,
                }))
              }
              placeholder={t("FILTER_TO_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <InputNumber
              min={1}
              value={formFilters.breakdownLimit}
              onChange={(value: number | null) =>
                setFormFilters((previous) => ({
                  ...previous,
                  breakdownLimit:
                    typeof value === "number" && value > 0
                      ? value
                      : DEFAULT_BREAKDOWN_LIMIT,
                }))
              }
              style={{ width: "100%" }}
              placeholder={t("FILTER_BREAKDOWN_LIMIT")}
            />
          </Col>
          <Col span={24}>
            <Button type="primary" onClick={applyFilters} style={{ marginRight: 8 }}>
              {t("FILTER_APPLY")}
            </Button>
            <Button onClick={resetFilters}>{t("FILTER_RESET")}</Button>
            <Button onClick={openAuditLogs} style={{ marginLeft: 8 }}>
              {t("OPEN_AUDIT_LOGS")}
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title={t("SUMMARY_TITLE")} loading={isLoading} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_TOTAL_BETS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.totalBets}
            </Typography.Title>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_TOTAL_STAKE_CENTS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.totalStakeCents}
            </Typography.Title>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_BETS_WITH_FREEBET")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.betsWithFreebet}
            </Typography.Title>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_BETS_WITH_ODDS_BOOST")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.betsWithOddsBoost}
            </Typography.Title>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_BETS_WITH_BOTH")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.betsWithBoth}
            </Typography.Title>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_TOTAL_FREEBET_APPLIED_CENTS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.totalFreebetAppliedCents}
            </Typography.Title>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_TOTAL_BOOSTED_STAKE_CENTS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.totalBoostedStakeCents}
            </Typography.Title>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_UNIQUE_USERS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.uniqueUsers}
            </Typography.Title>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_UNIQUE_FREEBETS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.uniqueFreebets}
            </Typography.Title>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Typography.Text type="secondary">
              {t("METRIC_UNIQUE_ODDS_BOOSTS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {summary.uniqueOddsBoosts}
            </Typography.Title>
          </Col>
        </Row>
      </Card>

      <Card
        title={t("DAILY_REPORTS_TITLE")}
        loading={isDailyReportLoading || isRepeatDailyReportLoading}
        style={{ marginBottom: 16 }}
        extra={
          <Space wrap>
            <Button
              type="primary"
              onClick={generateDailyReport}
              loading={isDailyReportLoading}
            >
              {t("DAILY_REPORTS_GENERATE")}
            </Button>
            <Input
              value={reportDate}
              onChange={(event) => setReportDate(event.target.value)}
              placeholder={t("DAILY_REPORTS_REPEAT_DATE")}
              style={{ width: 180 }}
            />
            <Button
              onClick={repeatDailyReport}
              loading={isRepeatDailyReportLoading}
              disabled={!reportDate.trim()}
            >
              {t("DAILY_REPORTS_REPEAT")}
            </Button>
            <Button
              onClick={exportExcludedPunters}
              loading={isExcludedPuntersExportLoading}
            >
              {t("DAILY_REPORTS_EXPORT_EXCLUSIONS")}
            </Button>
            <Button
              onClick={exportUserTransactions}
              loading={isUserTransactionsExportLoading}
              disabled={!queryFilters.userId}
            >
              {t("DAILY_REPORTS_EXPORT_TRANSACTIONS")}
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("DAILY_REPORTS_DATE")}
            </Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {dailyReport.date || "-"}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("DAILY_REPORTS_ACTIVE_USERS")}
            </Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {dailyReport.dashboard.metrics.activeUsers}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("DAILY_REPORTS_NEW_USERS")}
            </Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {dailyReport.dashboard.metrics.newUsers}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("DAILY_REPORTS_TOTAL_BETS")}
            </Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {dailyReport.dashboard.metrics.totalBets}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("DAILY_REPORTS_PLATFORM_PROFIT")}
            </Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {formatUsd(dailyReport.dashboard.metrics.platformProfit)}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("DAILY_REPORTS_ACTIVE_EXCLUSIONS")}
            </Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {dailyReport.activeExclusions}
            </Typography.Title>
          </Col>
        </Row>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label={t("DAILY_REPORTS_GENERATED_AT")}>
            {dailyReport.generatedAt || "-"}
          </Descriptions.Item>
          <Descriptions.Item label={t("DAILY_REPORTS_MARKET_ROWS")}>
            {dailyReport.marketReport.data.length}
          </Descriptions.Item>
          <Descriptions.Item label={t("DAILY_REPORTS_DEPOSITS_COUNT")}>
            {dailyReport.transactionSummary.depositsCount}
          </Descriptions.Item>
          <Descriptions.Item label={t("DAILY_REPORTS_DEPOSITS_AMOUNT")}>
            {formatUsd(dailyReport.transactionSummary.depositsAmount)}
          </Descriptions.Item>
          <Descriptions.Item label={t("DAILY_REPORTS_WITHDRAWALS_COUNT")}>
            {dailyReport.transactionSummary.withdrawalsCount}
          </Descriptions.Item>
          <Descriptions.Item label={t("DAILY_REPORTS_WITHDRAWALS_AMOUNT")}>
            {formatUsd(dailyReport.transactionSummary.withdrawalsAmount)}
          </Descriptions.Item>
          <Descriptions.Item label={t("DAILY_REPORTS_NET_CASH")}>
            {formatUsd(dailyReport.transactionSummary.netCash)}
          </Descriptions.Item>
          <Descriptions.Item label={t("DAILY_REPORTS_TOTAL_MATCHED")}>
            {formatUsd(dailyReport.dashboard.metrics.totalMatched)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t("FREEBETS_TABLE_TITLE")} loading={isLoading}>
            <Table
              columns={tableColumns}
              dataSource={summary.freebets}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: t("EMPTY") }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t("ODDS_BOOSTS_TABLE_TITLE")} loading={isLoading}>
            <Table
              columns={tableColumns}
              dataSource={summary.oddsBoosts}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: t("EMPTY") }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={t("RISK_INTELLIGENCE_TITLE")} loading={isRiskLoading} style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">
              {t("METRIC_RISK_SCORE")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {riskPlayerScore.riskScore}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">
              {t("METRIC_CHURN_SCORE")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {riskPlayerScore.churnScore}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">
              {t("METRIC_LTV_SCORE")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {riskPlayerScore.ltvScore}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">
              {t("CORRECTION_OPEN_TASKS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {correctionTasks.summary.open}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">
              {t("CORRECTION_RESOLVED_TASKS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {correctionTasks.summary.resolved}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">
              {t("CORRECTION_SUGGESTED_SUM")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {correctionTasks.summary.suggestedAdjustSum}
            </Typography.Title>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={t("RISK_SEGMENTS_TITLE")} loading={isRiskLoading}>
            <Table
              columns={riskSegmentColumns}
              dataSource={riskSegments}
              rowKey="userId"
              pagination={false}
              locale={{ emptyText: t("EMPTY") }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t("CORRECTION_TASKS_TITLE")} loading={isRiskLoading}>
            <Table
              columns={correctionTaskColumns}
              dataSource={correctionTasks.items}
              rowKey="taskId"
              pagination={false}
              locale={{ emptyText: t("EMPTY") }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={t("PREDICTION_OVERSIGHT_TITLE")}
        loading={isPredictionSummaryLoading}
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <RiskManagementPredictionExportButton
              summary={predictionSummary}
              disabled={!canExportPredictionMarkets}
            />
            {canViewPredictionAuditTrail ? (
              <Button onClick={openPredictionAuditLogs}>
                {t("OPEN_PREDICTION_AUDIT_LOGS")}
              </Button>
            ) : null}
            <Button onClick={() => router.push("/risk-management/prediction")}>
              {t("OPEN_PREDICTION_OPS")}
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("PREDICTION_TOTAL_MARKETS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {predictionSummary.totalMarkets}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("PREDICTION_LIVE_MARKETS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {predictionSummary.liveMarkets}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("PREDICTION_RESOLVED_MARKETS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {predictionSummary.resolvedMarkets}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("PREDICTION_TOTAL_ORDERS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {predictionSummary.totalOrders}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("PREDICTION_OPEN_ORDERS")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {predictionSummary.openOrders}
            </Typography.Title>
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Typography.Text type="secondary">
              {t("PREDICTION_TOTAL_VOLUME")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {formatUsd(predictionSummary.totalVolumeUsd)}
            </Typography.Title>
          </Col>
        </Row>
      </Card>
    </>
  );
};

export default RiskManagementSummaryContainer;
