import * as React from "react";
import styled from "styled-components";
import { useMessages } from "@brandserver-client/hooks";

const StyledWithdrawWagering = styled.div`
  .withdrawal-wagering__title {
    color: ${({ theme }) => theme.palette.primary};
    ${({ theme }) => theme.typography.text21BoldUpper};
    margin-bottom: 24px;
  }

  .withdraw-wagering__progress-container {
    width: 100%;
    padding: 20px 24px;
    background: ${({ theme }) => theme.palette.primaryLightest};
    border-radius: 10px;
    margin-bottom: 22px;
  }

  .withdrawal-wagering__subtitle {
    color: ${({ theme }) => theme.palette.contrastDark};
    ${({ theme }) => theme.typography.text16BoldUpper};
    margin-bottom: 15px;
    text-align: center;
  }

  .withdrawal-wagering__progress-meter,
  .withdrawal-wagering__progress-meter-filled {
    height: 8px;
    border-radius: 99px;
  }

  .withdrawal-wagering__progress-meter {
    width: 100%;
    background: ${({ theme }) => theme.palette.secondarySemiLightest};
  }

  .withdrawal-wagering__progress-meter-filled {
    background: ${({ theme }) => theme.palette.accent};
  }

  .withdrawal-wagering__amounts {
    margin-top: 14px;
    color: ${({ theme }) => theme.palette.contrastDark};
    ${({ theme }) => theme.typography.text18Bold};
    text-align: center;
  }

  .withdrawal-wagering__disclamer {
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
    ${({ theme }) => theme.typography.text16};
  }

  .withdrawal-wagering__disclamer--link {
    cursor: pointer;
  }

  .withdrawal-wagering__extra-block {
    margin-top: 20px;
  }
`;

interface Props {
  bonusPercentage: string;
  amount: string;
  requirementAmount: string;
  withdrawalAllowed: boolean;
  onClick: () => void;
}

const WithdrawWagering: React.FC<Props> = ({
  amount,
  requirementAmount,
  bonusPercentage,
  withdrawalAllowed,
  onClick
}: Props) => {
  const messages = useMessages({
    withdraw: "my-account.withdraw",
    amountToWager: "my-account.withdraw.balance.to-be-wagered",
    disclaimer: "my-account.withdraw.disclaimer3",
    extraFee: "my-account.withdraw.extra-fee"
  });

  return (
    <StyledWithdrawWagering>
      <div className="withdrawal-wagering__title">{messages.withdraw}</div>
      <div className="withdraw-wagering__progress-container">
        <div className="withdrawal-wagering__subtitle">
          {messages.amountToWager}
        </div>
        <div className="withdrawal-wagering__progress-meter">
          <div
            className="withdrawal-wagering__progress-meter-filled"
            style={{ width: bonusPercentage }}
          />
        </div>
        <div className="withdrawal-wagering__amounts">{`${amount} / ${requirementAmount}`}</div>
      </div>
      <div className="withdrawal-wagering__disclamer">
        {messages.disclaimer}
      </div>
      {withdrawalAllowed && (
        <div className="withdrawal-wagering__extra-block">
          <div
            className="withdrawal-wagering__disclamer withdrawal-wagering__disclamer--link"
            onClick={onClick}
          >
            {messages.extraFee}
          </div>
        </div>
      )}
    </StyledWithdrawWagering>
  );
};

export default WithdrawWagering;
