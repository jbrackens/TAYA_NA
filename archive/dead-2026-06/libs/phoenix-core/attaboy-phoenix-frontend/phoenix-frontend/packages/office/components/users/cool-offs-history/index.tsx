import React from "react";
import { useTranslation } from "i18n";
import { TablePagination } from "../../../types/filters.d";
import { CoolOffCause, CoolOffsHistoryData } from "../../../types/punters.d";
import Table from "../../layout/table";
import dayjs from "dayjs";
import { useTimezone } from "@phoenix-ui/utils";

type UsersDetailsCoolOffsHistoryListProps = {
  data: Array<CoolOffsHistoryData>;
  pagination: {} | TablePagination;
  isLoading: boolean | undefined;
  handleTableChange: any;
};

const UsersDetailsCoolOffsHistoryList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
}: UsersDetailsCoolOffsHistoryListProps) => {
  const { t } = useTranslation(["common", "page-users-details"]);

  const { getTimeWithTimezone } = useTimezone();

  const columns = [
    {
      title: t("page-users-details:HEADER_REASON"),
      dataIndex: "coolOffCause",
      key: "REASON",
      render: (coolOffCause: CoolOffCause) =>
        t(`page-users-details:${coolOffCause}`),
    },
    {
      title: t("page-users-details:HEADER_COOL_OFF_START"),
      dataIndex: "coolOffStart",
      key: "COOL_OFF_START",
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
    },
    {
      title: t("page-users-details:HEADER_COOL_OFF_END"),
      dataIndex: "coolOffEnd",
      key: "HEADER_COOL_OFF_END",
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

export default UsersDetailsCoolOffsHistoryList;
