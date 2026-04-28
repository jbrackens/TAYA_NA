import React from "react";
import { Typography } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "i18n";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer";
// import { RefsCollection } from "../../lib/utils/filters";
import {
  // composeOptions,
  resolveCategory,
  resolveProductLabel,
  resolveType,
} from "./utils/resolvers";
import Table from "../layout/table";
// import TableFilterText from "../layout/table/filter-text";
import {
  TalonAuditLog,
  TalonAuditLogs,
  TalonAuditLogCategory,
  TalonAuditLogType,
} from "../../types/logs";
import { TablePagination } from "../../types/filters";
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

  const formatJSON = (value: unknown) =>
    JSON.stringify(value || {}, null, "  ");

  const renderLog = (value: TalonAuditLog) => {
    const category = value?.category;
    const details = `${value?.details || ""}`.trim();
    const hasDifference =
      Boolean(value?.dataBefore && Object.keys(value.dataBefore).length) ||
      Boolean(value?.dataAfter && Object.keys(value.dataAfter).length);
    switch (category) {
      case TalonAuditLogCategory.CREATION:
        return (
          <Typography>
            {t("page-audit-logs:CELL_DETAILS_LABEL_NONE")}
          </Typography>
        );
      default:
        if (hasDifference) {
          const { dataBefore, dataAfter } = value;
          return (
            <>
              {details ? <Typography>{details}</Typography> : null}
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
        }
        if (details) {
          return <Typography>{details}</Typography>;
        }
        return (
          <Typography>
            {t("page-audit-logs:CELL_DETAILS_LABEL_NONE")}
          </Typography>
        );
    }
  };

  const { getTimeWithTimezone } = useTimezone();

  const defaultColumns = [
    {
      title: t("page-audit-logs:HEADER_DATE"),
      width: 240,
      render: (record: TalonAuditLog) => {
        const value = record?.occurredAt || record?.createdAt;
        if (!value) {
          return "-";
        }
        return getTimeWithTimezone(dayjs(value)).format(
          t("common:DATE_TIME_FORMAT"),
        );
      },
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
      render: (record: TalonAuditLog) =>
        t(
          `page-audit-logs:${resolveCategory(
            record?.category as TalonAuditLogCategory,
            record?.action,
          )}`,
        ),
    },
    {
      title: t("page-audit-logs:HEADER_ACTION"),
      width: 240,
      ellipsis: true,
      // sorter: true,
      render: (record: TalonAuditLog) =>
        t(
          `page-audit-logs:${resolveType(
            record?.type as TalonAuditLogType,
            record?.action,
          )}`,
        ),
    },
    {
      title: t("page-audit-logs:HEADER_PRODUCT"),
      width: 140,
      ellipsis: true,
      render: (record: TalonAuditLog) =>
        t(
          `page-audit-logs:${resolveProductLabel(
            `${record?.product || ""}`,
            `${record?.action || ""}`,
          )}`,
        ),
    },
    {
      title: t("page-audit-logs:HEADER_DETAILS"),
      render: renderLog,
    },
  ];
  const columns = additionalColumns
    .slice()
    .sort((first, second) => first.index - second.index)
    .reduce((previousColumns, currentColumn: ColumnDef) => {
      const nextColumns = [...previousColumns];
      const insertionIndex = Math.max(
        0,
        Math.min(currentColumn.index, nextColumns.length),
      );
      nextColumns.splice(insertionIndex, 0, currentColumn.value);
      return nextColumns;
    }, defaultColumns);

  return (
    <Table
      columns={columns}
      rowKey={(record: TalonAuditLog) =>
        `${record.id || ""}${record.occurredAt || record.createdAt || ""}`
      }
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
