import React from "react";
import { useTranslation } from "i18n";
import { isEmpty, snakeCase } from "lodash";
import dayjs from "dayjs";
import { Descriptions } from "antd";
import { TablePagination } from "../../../types/filters.d";
import {
  TalonPunterSessionHistory,
  TalonPunterSessionHistoryItem,
} from "../../../types/punters.d";
// import { RefsCollection } from "../../../lib/utils/filters";
// import TableFilterText from "../../layout/table/filter-text";
import Table from "../../layout/table";
import { Layout, Id, useTimezone } from "@phoenix-ui/utils";
import UserLifecycleLogout from "../lifecycle/logout";

type UsersDetailsSessionHistoryListProps = {
  data: TalonPunterSessionHistory;
  pagination: {} | TablePagination;
  isLoading: boolean | undefined;
  handleTableChange: any;
  setRefreshDataFunc: any;
  userId: Id;
};

const UsersDetailsSessionHistoryList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
  setRefreshDataFunc,
  userId,
}: UsersDetailsSessionHistoryListProps) => {
  const { t } = useTranslation(["common", "page-users-details"]);
  // const refs = new RefsCollection();

  const onLogout = () => {
    setRefreshDataFunc(true);
  };

  const renderDetails = (value: TalonPunterSessionHistoryItem) => {
    const { sessionId, details } = value;
    const keys = Object.keys(details || {});
    if (isEmpty(keys)) {
      return "N/A";
    }

    return (
      <Descriptions
        column={4}
        size={Layout.Size.SMALL}
        layout={Layout.Direction.VERTICAL}
      >
        {keys.map((key: string) => (
          <Descriptions.Item
            key={`${sessionId}-${key}`}
            label={t(
              `page-users-details:HEADER_SESSION_DETAILS_${snakeCase(
                key,
              ).toUpperCase()}`,
            )}
            labelStyle={{ fontWeight: "bold" }}
          >
            {details[key]}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  const { getTimeWithTimezone } = useTimezone();

  const renderEndTime = (value: string) => {
    if (value) {
      return getTimeWithTimezone(dayjs(value)).format(
        t("common:DATE_TIME_FORMAT"),
      );
    }

    return (
      <UserLifecycleLogout
        key="action-logout"
        id={userId}
        label={t("page-users-details:ACTION_END_SESSION")}
        onComplete={onLogout}
      />
    );
  };

  const columns = [
    {
      title: t("page-users-details:HEADER_SESSION_ID"),
      width: 240,
      // sorter: true,
      dataIndex: "sessionId",
      // ...TableFilterText.getColumnSearchProps(
      //   "sessionId",
      //   refs,
      //   t("page-users-details:HEADER_SESSION_ID"),
      // ),
    },
    {
      title: t("page-users-details:HEADER_SESSION_START"),
      width: 240,
      // sorter: true,
      dataIndex: "startTime",
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
      // ...TableFilterText.getColumnSearchProps(
      //   "startTime",
      //   refs,
      //   t("page-users-details:HEADER_SESSION_START"),
      // ),
    },
    {
      title: t("page-users-details:HEADER_SESSION_END"),
      width: 240,
      // sorter: true,
      dataIndex: "endTime",
      render: renderEndTime,
      // ...TableFilterText.getColumnSearchProps(
      //   "endTime",
      //   refs,
      //   t("page-users-details:HEADER_SESSION_END"),
      // ),
    },
    {
      title: t("page-users-details:HEADER_SESSION_DETAILS"),
      render: renderDetails,
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

export default UsersDetailsSessionHistoryList;
