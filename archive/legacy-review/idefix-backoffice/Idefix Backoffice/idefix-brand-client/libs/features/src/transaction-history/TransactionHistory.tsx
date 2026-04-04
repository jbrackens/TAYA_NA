import { TransactionHistory as TransactionHistoryType } from "@brandserver-client/types";
import * as React from "react";
import styled from "styled-components";
import SummaryItems from "./SummaryItems";
import HistoryTable from "./HistoryTable";
import { useMessages } from "@brandserver-client/hooks";

interface Props {
  history: TransactionHistoryType;
}

const StyledTransactionHistory = styled.div`
  display: flex;
  flex-direction: column;

  .transaction-history {
    &__title {
      margin-bottom: 16px;
      ${({ theme }) => theme.typography.text21BoldUpper};
      color: ${({ theme }) => theme.palette.contrastLight};
    }

    &__subtitle {
      margin: 0;
      ${({ theme }) => theme.typography.text16};
      color: ${({ theme }) => theme.palette.secondaryLight};
    }
  }
`;

const TransactionHistory: React.FC<Props> = ({ history }) => {
  const { payments, summary, transactions } = history;

  const messages = useMessages({
    title: "my-account.history.title",
    subtitle: "my-account.history.history-empty"
  });

  return (
    <StyledTransactionHistory>
      <h2 className="transaction-history__title">{messages.title}</h2>
      {!payments.length && (
        <p className="transaction-history__subtitle">{messages.subtitle}</p>
      )}
      {!!payments.length && (
        <>
          <SummaryItems summary={summary} transactions={transactions} />
          <HistoryTable payments={payments} />
        </>
      )}
    </StyledTransactionHistory>
  );
};

export default TransactionHistory;
