import React from "react";
import { Typography } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "i18n";
import { slice } from "lodash";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer";
// import { RefsCollection } from "../../lib/utils/filters";
import {
  // composeOptions,
  resolveCategory,
  resolveType,
} from "./utils/resolvers";
import Table from "../layout/table";
// import TableFilterText from "../layout/table/filter-text";
import {
  TalonAuditLogs,
  TalonAuditLog,
  TalonAuditLogCategory,
  TalonAuditLogType,
} from "../../types/logs.d";
import { TalonPunterAuditLogAdjustment } from "../../types/punters.d";
import { TablePagination } from "../../types/filters.d";
import { useTimezone } from "@phoenix-ui/utils";

const { Text } = Typography;

type ColumnDef = {
  index: number;
  value: any;
};

type AuditLogsListProps = {
  data: TalonAuditLogs;
  pagination: {} | TablePagination;
  isLoading: boolean | undefined;
  handleTableChange: any;
  additionalColumns?: ColumnDef[];
  scrollable?: boolean;
};

const AuditLogsList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
  additionalColumns = [],
  scrollable = false,
}: AuditLogsListProps) => {
  const { t } = useTranslation(["common", "page-audit-logs"]);
  // const refs = new RefsCollection();

  const formatJSON = (value: Object) => JSON.stringify(value, null, "  ");

  const renderLog = (value: TalonAuditLog) => {
    const { category } = value;
    switch (category) {
      case TalonAuditLogCategory.CREATION:
        return (
          <Typography>
            {t("page-audit-logs:CELL_DETAILS_LABEL_NONE")}
          </Typography>
        );
      case TalonAuditLogCategory.ADJUSTMENT:
        const {
          dataBefore,
          dataAfter,
        } = value as TalonPunterAuditLogAdjustment;
        return (
          <>
            <Typography>
              <Text strong>
                {t("page-audit-logs:CELL_DETAILS_LABEL_DIFFERENCE")}:
              </Text>
            </Typography>
            <ReactDiffViewer
              styles={{
                diffContainer: {
                  background: "transparent",
                  fontSize: ".75em",
                },
                contentText: {
                  lineHeight: "1em !important",
                },
                marker: {
                  paddingLeft: "1em !important",
                },
              }}
              oldValue={formatJSON(dataBefore)}
              newValue={formatJSON(dataAfter)}
              compareMethod={DiffMethod.WORDS}
              hideLineNumbers
              splitView={false}
            />
          </>
        );
      default:
        return null;
    }
  };

  const { getTimeWithTimezone } = useTimezone();

  const defaultColumns = [
    {
      title: t("page-audit-logs:HEADER_DATE"),
      width: 240,
      // sorter: true,
      dataIndex: "createdAt",
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
      // ...TableFilterText.getColumnSearchProps(
      //   "createdAt",
      //   refs,
      //   t("page-audit-logs:HEADER_DATE"),
      // ),
    },
    {
      title: t("page-audit-logs:HEADER_TYPE"),
      width: 160,
      // sorter: true,
      ellipsis: true,
      dataIndex: "category",
      // filters: composeOptions(t, "page-audit-logs:CELL_TYPE"),
      render: (category: TalonAuditLogCategory) =>
        t(`page-audit-logs:${resolveCategory(category)}`),
    },
    {
      title: t("page-audit-logs:HEADER_ACTION"),
      width: 240,
      ellipsis: true,
      // sorter: true,
      dataIndex: "type",
      render: (type: TalonAuditLogType) =>
        t(`page-audit-logs:${resolveType(type)}`),
    },
    {
      title: t("page-audit-logs:HEADER_DETAILS"),
      render: renderLog,
    },
  ];
  const columns = additionalColumns.reduce((prev, curr: ColumnDef) => {
    if (curr.index > prev.length - 1) {
      return [...prev, curr.value];
    }
    return [
      ...slice(prev, 0, curr.index),
      curr.value,
      ...slice(prev, prev.length - curr.index - 2),
    ];
  }, defaultColumns);

  return (
    <Table
      columns={columns}
      rowKey={(record) => record.createdAt}
      dataSource={data}
      pagination={{
        ...pagination,
        pageSizeOptions: ["10", "20", "50", "100"],
        showSizeChanger: true,
      }}
      loading={isLoading}
      scrollable={scrollable}
      onChange={handleTableChange}
    />
  );
};

export default AuditLogsList;
