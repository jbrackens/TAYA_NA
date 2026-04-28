import React, { useCallback, useState } from "react";
import { Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "i18n";
import { RefsCollection } from "../../../lib/utils/filters";
import {
  composeOptions,
  composeProductOptions,
  resolveProduct,
  resolveStatus,
  resolveType,
} from "./utils/resolvers";
import Table from "../../layout/table";
import TableFilterDateRange from "../../layout/table/filter-date-range";
import {
  TalonPunterWallet,
  TalonPunterWalletItem,
} from "../../../types/punters";
import { TablePagination } from "../../../types/filters";
import {
  WalletHistoryStatus,
  WalletActionType,
  Id,
  WalletActionTypeEnum,
  WalletHistoryStatusEnum,
  PaymentMethodTypeEnum,
  WalletProductEnum,
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

  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());
  const handleActioned = useCallback((transactionId: string) => {
    setActionedIds((prev) => new Set(prev).add(transactionId));
  }, []);

  const { since, until, category, product } = router.query as {
    since?: string;
    until?: string;
    category?: Array<WalletActionTypeEnum>;
    product?: Array<WalletProductEnum>;
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
          {value?.product === WalletProductEnum.PREDICTION &&
            value?.predictionContext && (
              <>
                <br />
                <Text strong={true}>
                  {t("page-transactions:HEADER_PREDICTION_MARKET")}:{" "}
                </Text>
                <Text>{value.predictionContext.marketTitle}</Text>
                <br />
                <Text strong={true}>
                  {t("page-transactions:HEADER_PREDICTION_MARKET_STATUS")}:{" "}
                </Text>
                <Text>{value.predictionContext.marketStatus}</Text>
                <br />
                <Text strong={true}>
                  {t("page-transactions:HEADER_PREDICTION_OUTCOME")}:{" "}
                </Text>
                <Text>{value.predictionContext.outcomeLabel}</Text>
                <br />
                <Text strong={true}>
                  {t("page-transactions:HEADER_PREDICTION_ORDER_STATUS")}:{" "}
                </Text>
                <Text>{value.predictionContext.orderStatus}</Text>
                {value.predictionContext.winningOutcomeLabel && (
                  <>
                    <br />
                    <Text strong={true}>
                      {t("page-transactions:HEADER_PREDICTION_RESOLVED_TO")}
                      :{" "}
                    </Text>
                    <Text>{value.predictionContext.winningOutcomeLabel}</Text>
                  </>
                )}
                {value.predictionContext.settlementReason && (
                  <>
                    <br />
                    <Text strong={true}>
                      {t(
                        "page-transactions:HEADER_PREDICTION_SETTLEMENT_REASON",
                      )}
                      :{" "}
                    </Text>
                    <Text>{value.predictionContext.settlementReason}</Text>
                  </>
                )}
                {value.predictionContext.settlementActor && (
                  <>
                    <br />
                    <Text strong={true}>
                      {t("page-transactions:HEADER_PREDICTION_SETTLED_BY")}
                      :{" "}
                    </Text>
                    <Text>{value.predictionContext.settlementActor}</Text>
                  </>
                )}
                {value.predictionContext.previousSettlementStatus && (
                  <>
                    <br />
                    <Text strong={true}>
                      {t("page-transactions:HEADER_PREDICTION_PREVIOUS_STATUS")}
                      :{" "}
                    </Text>
                    <Text>
                      {value.predictionContext.previousSettlementStatus}
                    </Text>
                  </>
                )}
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
      title: t("page-transactions:HEADER_PRODUCT"),
      dataIndex: "product",
      filters: composeProductOptions(t, "page-transactions:CELL_PRODUCT"),
      filteredValue: product
        ? Array.isArray(product)
          ? product
          : [product]
        : [],
      render: (product?: string) =>
        t(
          `page-transactions:${resolveProduct(
            (product as WalletProductEnum) || WalletProductEnum.SPORTSBOOK,
          )}`,
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
                value?.paymentMethod?.type === PaymentMethodTypeEnum.CHEQUE &&
                !actionedIds.has(value.transactionId)
              ) {
                return (
                  <TableActions
                    transactionId={value.transactionId}
                    punterId={punterId}
                    triggerWalletApi={triggerWalletApi}
                    onActioned={handleActioned}
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
