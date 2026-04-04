import React from "react";
import { useTranslation } from "i18n";
import { StyledTable, EmptyDataContainer } from "../../table/index.styled";
import { Container } from "./index.styled";
import { ConfigProvider } from "antd";
import { RgHistoryQueryEnum, RqHistoryType } from "../../pages/rg-history";

enum PeriodEnum {
  DAY = "DAY",
  MONTH = "MONTH",
  WEEK = "WEEK",
}

type PeriodType = PeriodEnum.DAY | PeriodEnum.MONTH | PeriodEnum.WEEK;

type RgHistoryData = {
  period: PeriodType;
  limit: string;
  effectiveFrom: string;
  limitType: string;
  requestedAt: string;
};

type RgHistoryDataArray = Array<RgHistoryData>;

type PaginationConfig = {
  current: number;
  total: number;
  onChange: (value: number) => void;
};

type RgLimitsHistoryTableProps = {
  data: RgHistoryDataArray;
  isLoading: boolean;
  paginationConfig: PaginationConfig;
  type: RqHistoryType;
};

const RgHistoryTable: React.FC<RgLimitsHistoryTableProps> = ({
  data,
  isLoading,
  paginationConfig,
  type,
}) => {
  const { t } = useTranslation(["rg-history"]);

  const limitsColumns = [
    {
      title: t("LIMIT_TYPE"),
      dataIndex: "LIMIT_TYPE",
      key: "LIMIT_TYPE",
    },
    {
      title: t("PERIOD"),
      dataIndex: "PERIOD",
      key: "PERIOD",
    },
    {
      title: t("LIMIT"),
      dataIndex: "LIMIT",
      key: "LIMIT",
    },
    {
      title: t("REQUESTED_AT"),
      dataIndex: "REQUESTED_AT",
      key: "REQUESTED_AT",
    },
    {
      title: t("EFFECTIVE_FROM"),
      dataIndex: "EFFECTIVE_FROM",
      key: "EFFECTIVE_FROM",
    },
  ];

  const coolOffColumns = [
    {
      title: t("REASON"),
      dataIndex: "REASON",
      key: "REASON",
    },
    {
      title: t("COOL_OFF_START"),
      dataIndex: "COOL_OFF_START",
      key: "COOL_OFF_START",
    },
    {
      title: t("COOL_OFF_END"),
      dataIndex: "COOL_OFF_END",
      key: "COOL_OFF_END",
    },
  ];

  const columns =
    type === RgHistoryQueryEnum.COOL_OFF ? coolOffColumns : limitsColumns;

  const emptyMessage =
    type === RgHistoryQueryEnum.COOL_OFF
      ? t("EMPTY_COOL_OFF_TABLE")
      : t("EMPTY_LIMITS_TABLE");

  return (
    <Container>
      <ConfigProvider
        renderEmpty={() => (
          <EmptyDataContainer>{emptyMessage}</EmptyDataContainer>
        )}
      >
        <StyledTable
          dataSource={data}
          columns={columns}
          scroll={{ x: true }}
          loading={isLoading}
          pagination={{
            ...paginationConfig,
            position: ["bottomCenter"],
          }}
        />
      </ConfigProvider>
    </Container>
  );
};

export { RgHistoryTable };
