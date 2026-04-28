import React from "react";
import { useTranslation } from "i18n";
import { TablePagination } from "../../../types/filters";
import {
  LimitsHistoryData,
  LimitType,
  PeriodType,
} from "../../../types/punters";
import Table from "../../layout/table";
import dayjs from "dayjs";
import { useTimezone } from "@phoenix-ui/utils";

type UsersDetailsLimitsHistoryListProps = {
  data: Array<LimitsHistoryData>;
  pagination: {} | TablePagination;
  isLoading: boolean | undefined;
  handleTableChange: any;
};

const UsersDetailsLimitsHistoryList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
}: UsersDetailsLimitsHistoryListProps) => {
  const { t } = useTranslation(["common", "page-users-details"]);

  const { getTimeWithTimezone } = useTimezone();

  const columns = [
    {
      title: t("page-users-details:HEADER_LIMIT_TYPE"),
      dataIndex: "limitType",
      key: "LIMIT_TYPE",
      render: (limitType: LimitType) => t(`page-users-details:${limitType}`),
    },
    {
      title: t("page-users-details:HEADER_PERIOD"),
      dataIndex: "period",
      key: "PERIOD",
      render: (period: PeriodType) => t(`page-users-details:${period}`),
    },
    {
      title: t("page-users-details:HEADER_LIMIT"),
      dataIndex: "limit",
      key: "LIMIT",
    },
    {
      title: t("page-users-details:HEADER_REQUESTED_AT"),
      dataIndex: "requestedAt",
      key: "REQUESTED_AT",
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
    },
    {
      title: t("page-users-details:HEADER_EFFECTIVE_FROM"),
      dataIndex: "effectiveFrom",
      key: "EFFECTIVE_FROM",
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
    },
  ];

  return (
    <Table
      columns={columns}
      rowKey={(record) => record.sessionId}
      dataSource={data}
      pagination={{
        ...pagination,
        pageSizeOptions: ["10", "20", "50", "100"],
        showSizeChanger: true,
      }}
      loading={isLoading}
      scrollable={true}
      onChange={handleTableChange}
    />
  );
};

export default UsersDetailsLimitsHistoryList;
