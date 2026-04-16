import React from "react";
import { Button, message } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { Button as ButtonEnum } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";

import { PredictionAdminSummary } from "../../prediction-ops/contracts";

type RiskManagementPredictionExportButtonProps = {
  summary: PredictionAdminSummary;
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

const RiskManagementPredictionExportButton = ({
  summary,
  disabled,
}: RiskManagementPredictionExportButtonProps) => {
  const { t } = useTranslation("page-risk-management-summary");

  const onClick = () => {
    try {
      const lines = [
        [
          t("PREDICTION_EXPORT_COLUMN_SECTION"),
          t("PREDICTION_EXPORT_COLUMN_PRODUCT"),
          t("PREDICTION_EXPORT_COLUMN_LABEL"),
          t("PREDICTION_EXPORT_COLUMN_VALUE"),
        ]
          .map(escapeCsv)
          .join(","),
        ...[
          [t("PREDICTION_EXPORT_SECTION_SUMMARY"), t("PREDICTION_EXPORT_PRODUCT_LABEL"), t("PREDICTION_TOTAL_MARKETS"), summary.totalMarkets],
          [t("PREDICTION_EXPORT_SECTION_SUMMARY"), t("PREDICTION_EXPORT_PRODUCT_LABEL"), t("PREDICTION_LIVE_MARKETS"), summary.liveMarkets],
          [t("PREDICTION_EXPORT_SECTION_SUMMARY"), t("PREDICTION_EXPORT_PRODUCT_LABEL"), t("PREDICTION_RESOLVED_MARKETS"), summary.resolvedMarkets],
          [t("PREDICTION_EXPORT_SECTION_SUMMARY"), t("PREDICTION_EXPORT_PRODUCT_LABEL"), t("PREDICTION_TOTAL_ORDERS"), summary.totalOrders],
          [t("PREDICTION_EXPORT_SECTION_SUMMARY"), t("PREDICTION_EXPORT_PRODUCT_LABEL"), t("PREDICTION_OPEN_ORDERS"), summary.openOrders],
          [t("PREDICTION_EXPORT_SECTION_SUMMARY"), t("PREDICTION_EXPORT_PRODUCT_LABEL"), t("PREDICTION_TOTAL_VOLUME"), summary.totalVolumeUsd],
        ].map((row) => row.map(escapeCsv).join(",")),
        ...summary.categories.map((category) =>
          [
            t("PREDICTION_EXPORT_SECTION_CATEGORY"),
            t("PREDICTION_EXPORT_PRODUCT_LABEL"),
            `${category.label} (${category.key})`,
            `markets=${category.marketCount}; live=${category.liveMarketCount}; open=${category.openMarketCount}; resolved=${category.resolvedMarketCount}`,
          ]
            .map(escapeCsv)
            .join(",")),
        ...summary.topMarkets.map((market) =>
          [
            t("PREDICTION_EXPORT_SECTION_TOP_MARKET"),
            t("PREDICTION_EXPORT_PRODUCT_LABEL"),
            market.title,
            `status=${market.status}; volumeUsd=${market.volumeUsd}; liquidityUsd=${market.liquidityUsd}`,
          ]
            .map(escapeCsv)
            .join(",")),
      ].join("\n");

      downloadCsv("Prediction Risk Summary.csv", lines);
      message.success(t("PREDICTION_EXPORT_SUCCESS"));
    } catch (error) {
      console.error({ error });
      message.error(t("PREDICTION_EXPORT_FAILURE"));
    }
  };

  return (
    <Button
      shape="round"
      icon={<FileTextOutlined />}
      type={ButtonEnum.Type.PRIMARY}
      onClick={onClick}
      disabled={disabled}
    >
      {t("PREDICTION_EXPORT_ACTION")}
    </Button>
  );
};

export default RiskManagementPredictionExportButton;
