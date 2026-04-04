import React, { useState, useCallback } from "react";
import {
  WalletHistoryActionElement,
  WalletActionType,
  WalletActionTypeEnum,
  WalletHistoryStatus,
  WalletHistoryStatusEnum,
  useTimezone,
} from "@phoenix-ui/utils";
import { List } from "antd";
import { CoreSpin } from "./../ui/spin";
import {
  ListItemContainer,
  IdsTableContainer,
  StyledTable,
  StyledTd,
  TdWithDynamicWidth,
  DynamicTableRow,
  DynamicTableTd,
  PaymentMethod,
  IdsTableAndPaymentContainer,
  StatusContainer,
  IdTd,
  TimeContainer,
  SuccessBadge,
  RejectedBadge,
  PendingBadge,
  NoDataContainer,
  Amount,
} from "./index.styled";
import { useTranslation } from "i18n";
import { useCurrency } from "../../services/currency";

type TransactionHistoryListProps = {
  transactions: Array<WalletHistoryActionElement>;
  isLoading: boolean;
};

const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
  transactions,
  isLoading,
}) => {
  const [idColumnWidth, setIdColumnWidth] = useState(0);
  const { formatCurrencyValue } = useCurrency();
  const { t } = useTranslation(["transaction-history"]);
  const tableColRef = useCallback(
    (node: any) => {
      if (node !== null) {
        setIdColumnWidth(node.getBoundingClientRect().width);
      }
    },
    [t],
  );

  const generateElementType = (type: WalletActionType) => {
    switch (type) {
      case WalletActionTypeEnum.BET_PLACEMENT:
        return t("BET_PLACEMENT");
      case WalletActionTypeEnum.BET_SETTLEMENT:
        return t("BET_SETTLEMENT");
      case WalletActionTypeEnum.DEPOSIT:
        return t("DEPOSIT");
      case WalletActionTypeEnum.WITHDRAWAL:
        return t("WITHDRAWAL");
      default:
        return "";
    }
  };

  const generateElementStatus = (status: WalletHistoryStatus) => {
    switch (status) {
      case WalletHistoryStatusEnum.COMPLETED:
        return <SuccessBadge>{t("COMPLETED")}</SuccessBadge>;
      case WalletHistoryStatusEnum.PENDING:
        return <PendingBadge>{t("PENDING")}</PendingBadge>;
      case WalletHistoryStatusEnum.CANCELLED:
        return <RejectedBadge>{t("CANCELLED")}</RejectedBadge>;
    }
  };

  const { getTimeWithTimezone } = useTimezone();
  const generateItemTime = (date: string) =>
    getTimeWithTimezone(date).format("lll");

  const generateId = (item: WalletHistoryActionElement) => {
    switch (item.category) {
      case WalletActionTypeEnum.BET_SETTLEMENT:
      case WalletActionTypeEnum.BET_PLACEMENT: {
        return (
          <>
            <IdTd>{t("BET_ID")}</IdTd>
            <DynamicTableTd>{item.betId}</DynamicTableTd>
          </>
        );
      }
      case WalletActionTypeEnum.WITHDRAWAL:
      case WalletActionTypeEnum.DEPOSIT: {
        return (
          <>
            <IdTd>{t("EXTERNAL_ID")}</IdTd>
            <DynamicTableTd>
              {item.externalId !== undefined ? item.externalId : "-"}
            </DynamicTableTd>
          </>
        );
      }
    }
  };

  const generatePaymentMethod = (item: WalletHistoryActionElement) => {
    return item.category === WalletActionTypeEnum.DEPOSIT ||
      item.category === WalletActionTypeEnum.WITHDRAWAL ? (
      <PaymentMethod role={"paymentMethod"}>
        {t(`${item.category}_${item.paymentMethod.type}`)}
      </PaymentMethod>
    ) : (
      <></>
    );
  };

  const generateIdsTable = (item: WalletHistoryActionElement) => {
    return (
      <IdsTableAndPaymentContainer>
        <StyledTable>
          <tbody>
            <DynamicTableRow>
              <TdWithDynamicWidth width={idColumnWidth}>
                {t("TRANSACTION_ID")}
              </TdWithDynamicWidth>
              <DynamicTableTd role={"transactionId"}>
                {item.transactionId}
              </DynamicTableTd>
            </DynamicTableRow>
            <DynamicTableRow>{generateId(item)}</DynamicTableRow>
          </tbody>
        </StyledTable>
        {generatePaymentMethod(item)}
      </IdsTableAndPaymentContainer>
    );
  };

  const generateBalanceTable = (item: WalletHistoryActionElement) => {
    return (
      <StyledTable>
        <tbody>
          <tr>
            <StyledTd ref={tableColRef}>
              {generateElementType(item.category)}
            </StyledTd>
            <Amount role={"transactionAmount"}>
              {formatCurrencyValue(item.transactionAmount.amount)}
            </Amount>
          </tr>
          <tr>
            <StyledTd>{t("BALANCE")}</StyledTd>
            <Amount role={"balance"}>
              {formatCurrencyValue(item.postTransactionBalance.amount)}
            </Amount>
          </tr>
        </tbody>
      </StyledTable>
    );
  };
  return (
    <>
      {transactions.length > 0 || isLoading ? (
        <List
          itemLayout="horizontal"
          dataSource={transactions}
          renderItem={(item) => (
            <ListItemContainer>
              <List.Item
                extra={
                  <div>
                    <StatusContainer>
                      {generateElementStatus(item.status)}
                    </StatusContainer>
                    <TimeContainer role={"createdAt"}>
                      {generateItemTime(item.createdAt)}
                    </TimeContainer>
                  </div>
                }
              >
                <List.Item.Meta title={<>{generateBalanceTable(item)}</>} />
              </List.Item>
              <IdsTableContainer>{generateIdsTable(item)}</IdsTableContainer>
            </ListItemContainer>
          )}
        ></List>
      ) : (
        <NoDataContainer>
          {isLoading ? <CoreSpin /> : t("NO_TRANSACTIONS_AVAILABLE")}
        </NoDataContainer>
      )}
    </>
  );
};

export default TransactionHistoryList;
