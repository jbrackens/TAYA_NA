import React, { useEffect, useMemo } from "react";
import { Alert, Card, Tag, Typography } from "antd";
import { useRouter } from "next/router";
import { Method, Id, PunterRoleEnum } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";

import Table from "../../../components/layout/table";
import { useApi } from "../../../services/api/api-service";
import { resolveToken, validateAndCheckEligibility } from "../../../utils/auth";
import {
  normalizePredictionOrders,
  PredictionOrder,
  PredictionOrdersResponse,
} from "../../prediction-ops/contracts";
import UserPredictionOrdersExport from "./export";

type UsersPredictionOrdersContainerProps = {
  id: Id;
};

const resolveStatusColor = (status: string) => {
  const normalized = `${status || ""}`.trim().toLowerCase();
  if (normalized === "open") {
    return "processing";
  }
  if (normalized === "won") {
    return "success";
  }
  if (normalized === "lost" || normalized === "cancelled") {
    return "default";
  }
  return "warning";
};

const UsersPredictionOrdersContainer = ({
  id,
}: UsersPredictionOrdersContainerProps) => {
  const { t } = useTranslation(["page-users-details", "page-prediction-ops"]);
  const router = useRouter();
  const canViewPredictionOrderFlow = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [
      PunterRoleEnum.ADMIN,
      PunterRoleEnum.TRADER,
    ]);
  }, []);
  const [triggerOrders, isLoading, ordersResponse] = useApi<PredictionOrdersResponse>(
    "admin/prediction/orders",
    Method.GET,
  );

  const { predictionP, predictionLimit, predictionStatus } = router.query as {
    predictionP?: number;
    predictionLimit?: number;
    predictionStatus?: string[] | string;
  };

  useEffect(() => {
    if (!canViewPredictionOrderFlow) {
      return;
    }
    const fetchPredictionOrders = async () => {
      try {
        await triggerOrders(undefined, {
          query: {
            user_id: id,
            ...(predictionStatus
              ? {
                  status: Array.isArray(predictionStatus)
                    ? predictionStatus[0]
                    : predictionStatus,
                }
              : {}),
          },
        });
      } catch (err) {
        console.error({ err });
      }
    };

    void fetchPredictionOrders();
  }, [canViewPredictionOrderFlow, id, predictionStatus, triggerOrders]);

  const normalizedOrders = useMemo(
    () =>
      normalizePredictionOrders(
        ordersResponse.succeeded ? ordersResponse.data : undefined,
      ),
    [ordersResponse.data, ordersResponse.succeeded],
  );

  const pageSize = Number(predictionLimit || 20);
  const currentPage = Number(predictionP || 1);
  const paginatedOrders = normalizedOrders.orders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleTableChange = (pagination: any, filters: any) => {
    const nextStatus = Array.isArray(filters.status)
      ? filters.status[0]
      : undefined;

    router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          ...(pagination.current && { predictionP: pagination.current }),
          ...(pagination.pageSize && { predictionLimit: pagination.pageSize }),
          ...(nextStatus ? { predictionStatus: nextStatus } : {}),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const columns = [
    {
      title: t("page-prediction-ops:ORDERS_TABLE_ORDER"),
      dataIndex: "orderId",
      key: "orderId",
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: t("page-prediction-ops:ORDERS_TABLE_MARKET"),
      dataIndex: "marketTitle",
      key: "marketTitle",
      ellipsis: true,
    },
    {
      title: t("page-prediction-ops:ORDERS_TABLE_OUTCOME"),
      dataIndex: "outcomeLabel",
      key: "outcomeLabel",
    },
    {
      title: t("page-prediction-ops:ORDERS_TABLE_STATUS"),
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "open", value: "open" },
        { text: "won", value: "won" },
        { text: "lost", value: "lost" },
        { text: "cancelled", value: "cancelled" },
      ],
      filteredValue: predictionStatus
        ? [Array.isArray(predictionStatus) ? predictionStatus[0] : predictionStatus]
        : null,
      render: (value: string) => (
        <Tag color={resolveStatusColor(value)}>{`${value}`.toUpperCase()}</Tag>
      ),
    },
    {
      title: t("page-prediction-ops:ORDERS_TABLE_SETTLEMENT"),
      key: "settlement",
      render: (_: unknown, order: PredictionOrder) => (
        <div>
          {order.marketStatus ? (
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {t("page-prediction-ops:EXPORT_COLUMN_MARKET_STATUS")}: {order.marketStatus}
            </Typography.Text>
          ) : null}
          {order.winningOutcomeLabel ? (
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {t("page-prediction-ops:EXPORT_COLUMN_WINNING_OUTCOME")}: {order.winningOutcomeLabel}
            </Typography.Text>
          ) : null}
          {order.settledAt ? (
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {t("page-prediction-ops:EXPORT_COLUMN_SETTLED_AT")}: {new Date(order.settledAt).toLocaleString()}
            </Typography.Text>
          ) : null}
          {order.previousSettlementStatus ? (
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {t("page-prediction-ops:EXPORT_COLUMN_PREVIOUS_SETTLEMENT_STATUS")}: {order.previousSettlementStatus}
            </Typography.Text>
          ) : null}
          {order.previousSettledAt ? (
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {t("page-prediction-ops:EXPORT_COLUMN_PREVIOUS_SETTLED_AT")}: {new Date(order.previousSettledAt).toLocaleString()}
            </Typography.Text>
          ) : null}
          {order.previousSettledAmountUsd !== undefined ? (
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {t("page-prediction-ops:EXPORT_COLUMN_PREVIOUS_SETTLED_AMOUNT")}: ${Number(order.previousSettledAmountUsd || 0).toFixed(2)}
            </Typography.Text>
          ) : null}
          {order.settlementReason ? (
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {t("page-prediction-ops:EXPORT_COLUMN_SETTLEMENT_REASON")}: {order.settlementReason}
            </Typography.Text>
          ) : null}
          {order.settlementActor ? (
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {t("page-prediction-ops:EXPORT_COLUMN_SETTLEMENT_ACTOR")}: {order.settlementActor}
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
        </div>
      ),
    },
    {
      title: t("page-prediction-ops:EXPORT_COLUMN_MARKET_STATUS"),
      dataIndex: "marketStatus",
      key: "marketStatus",
      render: (value?: string) =>
        value ? (
          <Tag color={resolveStatusColor(value)}>{`${value}`.toUpperCase()}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: t("page-prediction-ops:ORDERS_TABLE_STAKE"),
      dataIndex: "stakeUsd",
      key: "stakeUsd",
      render: (value: number) => `$${Number(value || 0).toFixed(2)}`,
    },
    {
      title: t("page-prediction-ops:EXPORT_COLUMN_WINNING_OUTCOME"),
      dataIndex: "winningOutcomeLabel",
      key: "winningOutcomeLabel",
      render: (value?: string) => value || "-",
    },
    {
      title: t("page-prediction-ops:EXPORT_COLUMN_SETTLED_AT"),
      dataIndex: "settledAt",
      key: "settledAt",
      render: (value?: string) => (value ? new Date(value).toLocaleString() : "-"),
    },
    {
      title: t("page-prediction-ops:ORDERS_TABLE_CREATED"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => new Date(value).toLocaleString(),
    },
  ];

  if (!canViewPredictionOrderFlow) {
    return (
      <Card title={t("page-users-details:HEADER_PREDICTION_ORDERS")}>
        <Alert
          type="warning"
          showIcon
          message={t("page-users-details:PREDICTION_ORDER_FLOW_RESTRICTED")}
        />
      </Card>
    );
  }

  return (
    <Card
      title={t("page-users-details:HEADER_PREDICTION_ORDERS")}
      extra={
        <UserPredictionOrdersExport
          id={id}
          orders={normalizedOrders.orders}
        />
      }
    >
      <Table
        rowKey="orderId"
        columns={columns}
        dataSource={paginatedOrders}
        loading={isLoading}
        onChange={handleTableChange}
        pagination={{
          current: currentPage,
          pageSize,
          total: normalizedOrders.totalCount,
          showSizeChanger: true,
        }}
      />
    </Card>
  );
};

export default UsersPredictionOrdersContainer;
