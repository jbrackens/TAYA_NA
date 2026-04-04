import * as React from "react";
import styled from "styled-components";
import { PendingWithdraw } from "@brandserver-client/types";
import { useMessages } from "@brandserver-client/hooks";
import PendingWithdrawal from "./PendingWithdraw";

const StyledPendingWithdrawals = styled.div`
  .withdrawal-tab__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.primary};
  }

  .withdrawal-tab__empty {
    margin-top: 20px;
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.primaryLight};
  }

  .withdrawal-tab__components {
    width: 100%;
    margin-top: 30px;
  }

  .withdraw-tab__container {
    margin-top: 30px;

    &:first-child {
      margin-top: 0px;
    }
  }
`;

interface Props {
  withdrawals?: PendingWithdraw[];
  onRemovePendingWithdraw: (id: string) => Promise<void>;
}

const PendingWithdrawals: React.FC<Props> = ({
  withdrawals,
  onRemovePendingWithdraw
}) => {
  const messages = useMessages({
    title: "my-account.pending-withdrawals.title",
    empty: "my-account.pending-withdrawals.empty"
  });

  return (
    <StyledPendingWithdrawals>
      <div className="withdrawal-tab__title">{messages.title}</div>
      {withdrawals && withdrawals.length === 0 && (
        <div className="withdrawal-tab__empty">{messages.empty}</div>
      )}
      {withdrawals && withdrawals.length > 0 && (
        <div className="withdrawal-tab__components">
          {withdrawals.map((withdraw: PendingWithdraw) => (
            <div
              className="withdraw-tab__container"
              key={withdraw.UniqueTransactionID}
            >
              <PendingWithdrawal
                withdraw={withdraw}
                onCancel={onRemovePendingWithdraw}
              />
            </div>
          ))}
        </div>
      )}
    </StyledPendingWithdrawals>
  );
};

export default PendingWithdrawals;
