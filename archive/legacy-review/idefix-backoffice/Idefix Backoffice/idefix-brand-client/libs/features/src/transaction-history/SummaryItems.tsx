import * as React from "react";
import cn from "classnames";
import styled from "styled-components";
import {
  HistoryIcon,
  DownloadIcon,
  WithdrawIcon,
  DepositIcon,
  WalletIcon
} from "@brandserver-client/icons";
import { HistorySummary, Transaction } from "@brandserver-client/types";
import { useMessages } from "@brandserver-client/hooks";
import SummaryItem from "./SummaryItem";

interface IProps {
  summary: HistorySummary;
  transactions: Transaction[];
}

const StyledSummaryItems = styled.div`
  --gap: 12px;
  display: flex;
  flex-wrap: wrap;
  margin: calc(-1 * var(--gap)) 0 0 calc(-1 * var(--gap));
  width: calc(100% + var(--gap));

  .summary-items {
    &__item {
      flex: 1 1 180px;
      margin: var(--gap) 0 0 var(--gap);

      &--total-deposits {
        background: ${({ theme }) => theme.palette.primaryLightest};
        color: ${({ theme }) => theme.palette.contrastLight};

        & > .summary-item__icon > svg {
          fill: ${({ theme }) => theme.palette.accent2};
        }
      }

      &--total-withdrawals {
        background: ${({ theme }) => theme.palette.primaryLightest};
        color: ${({ theme }) => theme.palette.contrastLight};

        & > .summary-item__icon > svg {
          fill: ${({ theme }) => theme.palette.accent2};
        }
      }

      &--total {
        background: ${({ theme }) => theme.palette.primaryLightest};
        color: ${({ theme }) => theme.palette.contrastLight};

        & > .summary-item__icon > svg {
          fill: ${({ theme }) => theme.palette.accent2};
        }
      }

      &--win-bet-history {
        background: ${({ theme }) => theme.palette.primaryLightest};
        color: ${({ theme }) => theme.palette.contrastLight};

        & > .summary-item__icon > svg {
          fill: ${({ theme }) => theme.palette.accent2};
        }
      }
    }

    &__month-select-wrapper {
      display: flex;
      justify-content: space-between;

      button {
        border: 0;
        padding: 0;
        cursor: pointer;
        margin-left: 12px;
        background-color: transparent;

        svg {
          fill: ${({ theme }) => theme.palette.contrastLight};
          vertical-align: middle;
        }
      }
    }

    &__select {
      position: relative;
      display: flex;

      select {
        width: 100%;
        border: none;
        appearance: none;
        background: transparent;
        color: ${({ theme }) => theme.palette.contrastLight};
        ${({ theme }) => theme.typography.text16};
        cursor: pointer;
        padding-right: 16px;
      }

      &::after {
        top: 50%;
        transform: translate(50%, -50%);
        position: absolute;
        right: 6px;
        content: "";
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: ${({ theme }) =>
          `8px solid ${theme.palette.contrastLight}`};
      }
    }
  }
`;

const SummaryItems = ({
  summary: { deposits, withdrawals, total },
  transactions
}: IProps) => {
  const [month, setMonth] = React.useState(
    transactions.length ? transactions[0].month : ""
  );

  const handleDownloadReport = React.useCallback(() => {
    if (month) {
      window.open(`/api/statement/${month}`, "_blank");
    }
  }, [month]);

  const messages = useMessages({
    totalDeposits: "my-account.history.totalDeposits",
    totalWithdrawals: "my-account.history.totalWithdrawals",
    total: "my-account.history.total",
    winBetHistory: "my-account.history.winBetHistory"
  });

  const summaryItems = React.useMemo(
    () => [
      {
        key: "total-deposits",
        Icon: DepositIcon,
        title: messages.totalDeposits,
        content: deposits
      },
      {
        key: "total-withdrawals",
        Icon: WithdrawIcon,
        title: messages.totalWithdrawals,
        content: withdrawals
      },
      {
        key: "total",
        Icon: WalletIcon,
        title: messages.total,
        content: total
      },
      {
        key: "win-bet-history",
        Icon: HistoryIcon,
        title: messages.winBetHistory,
        content: (
          <div className="summary-items__month-select-wrapper">
            <div className="summary-items__select">
              <select onChange={e => setMonth(e.target.value)}>
                {transactions &&
                  transactions.map(({ month, text }) => (
                    <option value={month} key={month}>
                      {text}
                    </option>
                  ))}
              </select>
            </div>

            <button onClick={handleDownloadReport}>
              <DownloadIcon />
            </button>
          </div>
        )
      }
    ],
    [messages, handleDownloadReport]
  );

  return (
    <StyledSummaryItems>
      {summaryItems.map(({ Icon, title, content, key }) => (
        <SummaryItem
          key={key}
          title={title}
          content={content}
          icon={<Icon />}
          className={cn("summary-items__item", `summary-items__item--${key}`)}
        />
      ))}
    </StyledSummaryItems>
  );
};

export default SummaryItems;
