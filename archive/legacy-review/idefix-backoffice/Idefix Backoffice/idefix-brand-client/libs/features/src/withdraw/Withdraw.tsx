import * as React from "react";
import { Withdraw as WithdrawType } from "@brandserver-client/types";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { getUpdate } from "@brandserver-client/lobby";
import { getBonusPercentage } from "@brandserver-client/utils";
import { Iframe } from "../my-account-iframe";
import WithdrawWagering from "./components/WithdrawWagering";
import { useWithdraw } from "./useWithdraw";
import WithdrawView from "./WithdrawView";

interface IProps {
  withdraw: WithdrawType;
}

const Withdraw: React.FC<IProps> = ({ withdraw }) => {
  const [withdrawWithExtraFee, setWithdrawWithExtraFee] = React.useState(false);
  const update = useSelector(getUpdate);

  const {
    iframeSource,
    activationSend,
    handleActivationLink,
    handleBankIdentify
  } = useWithdraw();

  if (iframeSource) {
    return <Iframe src={iframeSource} />;
  }

  const {
    verificationStatus,
    withdrawOptions: { options },
    accessStatus: { KycChecked },
    currentBonus: {
      BonusWagerRequirementAchievedPercentage,
      BonusWagerRequirement,
      BonusWagerRequirementRemain
    },
    withdrawalFeeConfiguration,
    withdrawalAllowed
  } = withdraw;

  const {
    balance: { CurrentTotalBalance, Activated }
  } = update;

  const bonusPercentage = getBonusPercentage(
    BonusWagerRequirementAchievedPercentage
  );

  const handleWithdrawWithExtraFeeClick = () => setWithdrawWithExtraFee(true);

  return (
    <StyledWithdraw>
      {!withdraw.currentBonus.WageringComplete &&
      !withdrawWithExtraFee &&
      CurrentTotalBalance ? (
        <WithdrawWagering
          bonusPercentage={bonusPercentage}
          amount={BonusWagerRequirementRemain}
          requirementAmount={BonusWagerRequirement}
          withdrawalAllowed={withdrawalAllowed}
          onClick={handleWithdrawWithExtraFeeClick}
        />
      ) : (
        <WithdrawView
          displayProps={{
            ...verificationStatus,
            activated: Activated,
            checked: KycChecked
          }}
          balance={CurrentTotalBalance}
          activationSend={activationSend}
          withdrawalOptions={options}
          withdrawalFee={withdrawalFeeConfiguration}
          onActivationSend={handleActivationLink}
          onBankIdentify={handleBankIdentify}
        />
      )}
    </StyledWithdraw>
  );
};

const StyledWithdraw = styled.div`
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

export default Withdraw;
