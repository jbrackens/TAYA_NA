import React from "react";
import { Button, message } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { useTranslation } from "i18n";
import { Id, Button as ButtonEnum } from "@phoenix-ui/utils";

import { PredictionOrder } from "../../../prediction-ops/contracts";

type UserPredictionOrdersExportProps = {
  id: Id;
  orders: PredictionOrder[];
};

const escapeCsv = (value: string | number | undefined | null) =>
  `"${`${value ?? ""}`.replace(/"/g, '""')}"`;

const UserPredictionOrdersExport = ({
  id,
  orders,
}: UserPredictionOrdersExportProps) => {
  const { t } = useTranslation("page-prediction-ops");

  const onClick = () => {
    try {
      const lines = [
        [
          t("EXPORT_COLUMN_PRODUCT"),
          t("ORDERS_TABLE_ORDER"),
          t("EXPORT_COLUMN_CATEGORY"),
          t("ORDERS_TABLE_MARKET"),
          t("ORDERS_TABLE_OUTCOME"),
          t("ORDERS_TABLE_STATUS"),
          t("EXPORT_COLUMN_MARKET_STATUS"),
          t("ORDERS_TABLE_STAKE"),
          t("EXPORT_COLUMN_MAX_PAYOUT"),
          t("EXPORT_COLUMN_WINNING_OUTCOME"),
          t("EXPORT_COLUMN_SETTLED_AT"),
          t("EXPORT_COLUMN_SETTLEMENT_REASON"),
          t("EXPORT_COLUMN_SETTLEMENT_ACTOR"),
          t("EXPORT_COLUMN_PREVIOUS_SETTLED_AT"),
          t("EXPORT_COLUMN_PREVIOUS_SETTLED_AMOUNT"),
          t("EXPORT_COLUMN_PREVIOUS_SETTLEMENT_STATUS"),
          t("ORDERS_TABLE_CREATED"),
        ]
          .map(escapeCsv)
          .join(","),
        ...orders.map((order) =>
          [
            t("EXPORT_PRODUCT_LABEL"),
            order.orderId,
            order.categoryLabel,
            order.marketTitle,
            order.outcomeLabel,
            order.status,
            order.marketStatus,
            order.stakeUsd,
            order.maxPayoutUsd,
            order.winningOutcomeLabel,
            order.settledAt,
            order.settlementReason,
            order.settlementActor,
            order.previousSettledAt,
            order.previousSettledAmountUsd,
            order.previousSettlementStatus,
            order.createdAt,
          ]
            .map(escapeCsv)
            .join(",")),
      ].join("\n");

      const url = window.URL.createObjectURL(
        new Blob([lines], { type: "text/csv;charset=utf-8;" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Prediction Orders - ${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success(t("EXPORT_SUCCESS"));
    } catch (error) {
      console.error({ error });
      message.error(t("EXPORT_FAILURE"));
    }
  };

  return (
    <Button
      shape="round"
      icon={<FileTextOutlined />}
      type={ButtonEnum.Type.PRIMARY}
      onClick={onClick}
      disabled={!orders.length}
    >
      {t("ACTION_EXPORT")}
    </Button>
  );
};

export default UserPredictionOrdersExport;
