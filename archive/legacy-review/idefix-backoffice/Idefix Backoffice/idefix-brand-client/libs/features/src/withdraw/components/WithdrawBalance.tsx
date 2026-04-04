import * as React from "react";
import styled from "styled-components";
import { useMessages } from "@brandserver-client/hooks";

const StyledWithdrawBalance = styled.div`
  .withdraw-balance__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.contrastLight};
    margin-bottom: 16px;
  }

  .withdraw-balance__balance {
    margin: 0 0 10px 0;
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.contrastDark};
  }

  .withdraw-balance__info {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrastDark};
  }
`;

interface Props {
  balance: string;
  showInfo?: boolean;
}

const WithdrawBalance: React.FC<Props> = ({ balance, showInfo }) => {
  const messages = useMessages({
    title: "my-account.withdraw.balance.withdrawable",
    disclaimer: "my-account.withdraw.disclaimer"
  });

  return (
    <StyledWithdrawBalance>
      <h2 className="withdraw-balance__title">{messages.title}</h2>
      <h1 className="withdraw-balance__balance">{balance}</h1>
      {showInfo && (
        <p className="withdraw-balance__info">{messages.disclaimer}</p>
      )}
    </StyledWithdrawBalance>
  );
};

export default WithdrawBalance;
