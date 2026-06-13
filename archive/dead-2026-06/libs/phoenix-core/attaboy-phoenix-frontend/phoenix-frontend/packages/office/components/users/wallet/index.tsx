import React from "react";
import { Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "i18n";
import { RefsCollection } from "../../../lib/utils/filters";
import { composeOptions, resolveStatus, resolveType } from "./utils/resolvers";
import Table from "../../layout/table";
import TableFilterDateRange from "../../layout/table/filter-date-range";
import {
  TalonPunterWallet,
  TalonPunterWalletItem,
} from "../../../types/punters.d";
import { TablePagination } from "../../../types/filters";
import {
  WalletHistoryStatus,
  WalletActionType,
  Id,
  WalletActionTypeEnum,
  WalletHistoryStatusEnum,
  PaymentMethodTypeEnum,
  useTimezone,
} from "@phoenix-ui/utils";
import UserDetailsWalletExport from "./export";
import { useRouter } from "next/router";
import { TableActions } from "./table-actions";
import { addQueryParam } from "../../../utils/queryParams";

const { Text } = Typography;

type UsersDetailsWalletsListProps = {
  data: TalonPunterWallet;
  pagination: {} | TablePagination;
  isLoading: boolean | undefined;
  handleTableChange: any;
  punterId: Id;
  triggerWalletApi: Function;
};

export enum TimeFilterEnum {
  LAST_YEAR = "lastYear",
  LAST_24_HOURS = "last24Hours",
  LAST_WEEK = "lastWeek",
  LAST_MONTH = "lastMonth",
  LAST_3_MONTHS = "last3Months",
  LAST_6_MONTHS = "last6Months",
  LAST_12_MONTHS = "last12Months",
}

const UsersDetailsWalletsList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
  punterId,
  triggerWalletApi,
}: UsersDetailsWalletsListProps) => {
  const { t } = useTranslation(["common", "page-transactions"]);
  const refs = new RefsCollection();
  const router = useRouter();

  const { since, until, category } = router.query as {
    since?: string;
    until?: string;
    category?: Array<WalletActionTypeEnum>;
  };

  const generateColumnDateSearch = (
    fieldName: string,
    title: string,
    onClearFilter?: () => void,
    defaultSinceValue?: string,
    defaultUntilValue?: string,
  ) =>
    TableFilterDateRange.getColumnSearchProps(
      fieldName,
      refs,
      t(title),
      defaultSinceValue,
      defaultUntilValue,
      onClearFilter,
    );

  const dateColumnSearch = generateColumnDateSearch(
    "createdAt",
    t("page-transactions:HEADER_DATE"),
    () => addQueryParam({ since: "", until: "" }, router),
    since,
    until,
  );

  const isActionColExists = data.some(
    (transaction) => transaction.status === WalletHistoryStatusEnum.PENDING,
  );

  const { getTimeWithTimezone } = useTimezone();

  const columns = [
    {
      title: t("page-transactions:HEADER_DATE"),
      sorter: false,
      dataIndex: "createdAt",
      ...dateColumnSearch,
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
      filteredValue: since ? (Array.isArray(since) ? since : [since]) : [],
    },
    {
      title: t("page-transactions:HEADER_TRANSACTION"),
      width: 450,
      ellipsis: true,
      render: (value: TalonPunterWalletItem) => (
        <Typography>
          <Text strong={true}>
            {t("page-transactions:HEADER_TRANSACTION_ID")}:{" "}
          </Text>
          <Text>{value.transactionId}</Text>
          {value?.externalId && (
            <Text strong={true}>
              {t("page-transactions:HEADER_TRANSACTION_EXTERNAL_ID")}:{" "}
            </Text>
          )}
          {value?.externalId && (
            <>
              <br />
              <Text strong={true}>
                {t("page-transactions:HEADER_TRANSACTION_EXTERNAL")}:{" "}
              </Text>{" "}
              <Text>{value?.externalId}</Text>
            </>
          )}
          {value?.paymentMethod?.details && (
            <>
              <br />
              <Text strong={true}>
                {t("page-transactions:HEADER_DETAILS")}:{" "}
              </Text>{" "}
              <Text>{value?.paymentMethod.details}</Text>
            </>
          )}
          {value?.paymentMethod?.adminPunterId && (
            <>
              <br />
              <Text strong={true}>
                {t("page-transactions:HEADER_TRANSACTION_ADMIN_ID")}:{" "}
              </Text>{" "}
              <Text>{value?.paymentMethod.adminPunterId}</Text>
            </>
          )}
        </Typography>
      ),
    },
    {
      title: t("page-transactions:HEADER_STATUS"),
      // sorter: true,
      dataIndex: "status",
      // filters: composeOptions(t, "page-transactions:CELL_STATUS"),
      render: (status: WalletHistoryStatus) => {
        const { color, tKey } = resolveStatus(status);
        return (
          <Tag color={color} key={status}>
            {t(`page-transactions:${tKey}`).toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: t("page-transactions:HEADER_TRANSACTION_METHOD"),
      ellipsis: true,
      render: (value: TalonPunterWalletItem) => (
        <Typography>
          {value?.paymentMethod?.type && (
            <>
              <Text>{t(`page-transactions:${value?.paymentMethod.type}`)}</Text>
            </>
          )}
        </Typography>
      ),
    },
    {
      title: t("page-transactions:HEADER_TYPE"),
      sorter: false,
      dataIndex: "category",
      filters: composeOptions(t, "page-transactions:CELL_TYPE"),
      filteredValue: category
        ? Array.isArray(category)
          ? category
          : [category]
        : [],
      render: (type: WalletActionType) =>
        t(`page-transactions:${resolveType(type)}`),
    },
    {
      title: t("page-transactions:HEADER_AMOUNT"),
      // sorter: (a: any, b: any) =>
      //   a.transactionAmount.amount - b.transactionAmount.amount,
      dataIndex: "transactionAmount",
      render: (transactionAmount: any) => (
        <span>
          {transactionAmount.amount} {transactionAmount.currency}
        </span>
      ),
      // ...TableFilterText.getColumnSearchProps(
      //   "amount",
      //   refs,
      //   t("page-transactions:HEADER_AMOUNT"),
      // ),
    },
    {
      title: t("page-transactions:HEADER_BALANCE_AFTER"),
      // sorter: (a: any, b: any) =>
      //   a.postTransactionBalance.amount - b.postTransactionBalance.amount,
      dataIndex: "postTransactionBalance",
      render: (postTransactionBalance: any) => (
        <span>
          {postTransactionBalance.amount} {postTransactionBalance.currency}
        </span>
      ),
      // ...TableFilterText.getColumnSearchProps(
      //   "balanceAfter",
      //   refs,
      //   t("page-transactions:HEADER_BALANCE_AFTER"),
      // ),
    },
    ...(isActionColExists
      ? [
          {
            title: t("page-transactions:HEADER_ACTION"),
            dataIndex: "",
            render: (value: TalonPunterWalletItem) => {
              if (
                value.status === WalletHistoryStatusEnum.PENDING &&
                value?.paymentMethod?.type === PaymentMethodTypeEnum.CHEQUE
              ) {
                return (
                  <TableActions
                    transactionId={value.transactionId}
                    punterId={punterId}
                    triggerWalletApi={triggerWalletApi}
                  />
                );
              }
              return <></>;
            },
          },
        ]
      : []),
  ];

  const footer = () => {
    return <UserDetailsWalletExport id={punterId} />;
  };

  return (
    <Table
      columns={columns}
      rowKey={(record) => record.transactionId + record.createdAt}
      dataSource={data}
      pagination={{
        ...pagination,
        pageSizeOptions: ["10", "20", "50", "100"],
        showSizeChanger: true,
      }}
      loading={isLoading}
      scrollable={true}
      onChange={handleTableChange}
      footer={footer}
    />
  );
};

export default UsersDetailsWalletsList;
