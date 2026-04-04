import React from "react";
import { Button, message } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { Button as ButtonEnum } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";

import { PredictionMarket, PredictionOrder } from "../contracts";

type PredictionOpsExportButtonProps =
  | {
      kind: "markets";
      markets: PredictionMarket[];
      disabled?: boolean;
    }
  | {
      kind: "orders";
      orders: PredictionOrder[];
      disabled?: boolean;
    };

const escapeCsv = (value: string | number | boolean | undefined | null) =>
  `"${`${value ?? ""}`.replace(/"/g, '""')}"`;

const downloadCsv = (filename: string, lines: string) => {
  const url = window.URL.createObjectURL(
    new Blob([lines], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const PredictionOpsExportButton = (props: PredictionOpsExportButtonProps) => {
  const { t } = useTranslation("page-prediction-ops");

  const onClick = () => {
    try {
      if (props.kind === "markets") {
        const lines = [
          [
            t("EXPORT_COLUMN_PRODUCT"),
            t("EXPORT_MARKET_COLUMN_ID"),
            t("TABLE_MARKET"),
            t("TABLE_CATEGORY"),
            t("TABLE_STATUS"),
            t("EXPORT_MARKET_COLUMN_FEATURED"),
            t("EXPORT_MARKET_COLUMN_LIVE"),
            t("TABLE_VOLUME"),
            t("TABLE_LIQUIDITY"),
            t("TABLE_PARTICIPANTS"),
            t("EXPORT_MARKET_COLUMN_CLOSES_AT"),
            t("EXPORT_MARKET_COLUMN_RESOLVES_AT"),
            t("DETAIL_RESOLUTION_SOURCE"),
            t("EXPORT_MARKET_COLUMN_TAGS"),
          ]
            .map(escapeCsv)
            .join(","),
          ...props.markets.map((market) =>
            [
              t("EXPORT_PRODUCT_LABEL"),
              market.marketId,
              market.title,
              market.categoryLabel,
              market.status,
              market.featured,
              market.live,
              market.volumeUsd,
              market.liquidityUsd,
              market.participants,
              market.closesAt,
              market.resolvesAt,
              market.resolutionSource,
              market.tags.join("|"),
            ]
              .map(escapeCsv)
              .join(",")),
        ].join("\n");

        downloadCsv("Prediction Market Catalog.csv", lines);
        message.success(t("EXPORT_MARKETS_SUCCESS"));
        return;
      }

      const lines = [
        [
          t("EXPORT_COLUMN_PRODUCT"),
          t("ORDERS_TABLE_ORDER"),
          t("ORDERS_TABLE_PUNTER"),
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
        ...props.orders.map((order) =>
          [
            t("EXPORT_PRODUCT_LABEL"),
            order.orderId,
            order.punterId,
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

      downloadCsv("Prediction Order Flow.csv", lines);
      message.success(t("EXPORT_ORDERS_SUCCESS"));
    } catch (error) {
      console.error({ error });
      message.error(
        props.kind === "markets"
          ? t("EXPORT_MARKETS_FAILURE")
          : t("EXPORT_ORDERS_FAILURE"),
      );
    }
  };

  const disabled =
    props.disabled ||
    (props.kind === "markets" ? !props.markets.length : !props.orders.length);

  return (
    <Button
      shape="round"
      icon={<FileTextOutlined />}
      type={ButtonEnum.Type.PRIMARY}
      onClick={onClick}
      disabled={disabled}
    >
      {props.kind === "markets"
        ? t("ACTION_EXPORT_MARKETS")
        : t("ACTION_EXPORT_ORDERS")}
    </Button>
  );
};

export default PredictionOpsExportButton;
