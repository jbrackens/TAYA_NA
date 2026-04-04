import * as React from "react";
import styled from "styled-components";
import Link from "next/link";
import { useMessages } from "@brandserver-client/hooks";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";

const StyledWithdrawDone = styled.div`
  .withdraw-done__title {
    color: ${({ theme }) => theme.palette.primary};
    ${({ theme }) => theme.typography.text21BoldUpper};
  }

  .withdraw-done__description {
    margin-top: 16px;
    margin-bottom: 40px;
    color: ${({ theme }) => theme.palette.primaryLight};
    ${({ theme }) => theme.typography.text16};
  }

  .withdraw-done__pending-wrapper {
    background: ${({ theme }) => theme.palette.secondaryLightest};
    border-radius: 10px;
    padding: 18px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex-direction: column;
    }
  }

  .withdraw-done__cancel-text {
    ${({ theme }) => theme.typography.text16Bold};
    color: ${({ theme }) => theme.palette.primary};

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      max-width: 50%;
    }
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-bottom: 18px;
      text-align: center;
    }
  }

  .withdraw-done__button {
    padding: 14px 16px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      padding: 16px;
      height: 56px;
    }
  }
`;

const WithdrawDone = () => {
  const { Button } = useRegistry();
  const messages = useMessages({
    withdraw: "my-account.withdraw",
    description: "my-account.withdraw-done.title",
    cancelWithdraw: "my-account.withdraw-done.cancel-withdrawals-text",
    pendingWithdrawals: "my-account.withdraw-done.pending-withdrawals"
  });
  return (
    <StyledWithdrawDone>
      <div className="withdraw-done__title">{messages.withdraw}</div>
      <div className="withdraw-done__description">{messages.description}</div>
      <div className="withdraw-done__pending-wrapper">
        <div className="withdraw-done__cancel-text">
          {messages.cancelWithdraw}
        </div>
        <Link
          href={`/loggedin/myaccount/withdraw-pending`}
          as={`/loggedin/myaccount/withdraw-pending`}
        >
          <a>
            <Button
              className="withdraw-done__button"
              color={Button.Color.accent}
            >
              {messages.pendingWithdrawals}
            </Button>
          </a>
        </Link>
      </div>
    </StyledWithdrawDone>
  );
};

export { WithdrawDone };
