import { useMessages } from "@brandserver-client/hooks";
import {
  BonusOption,
  CampaignOption,
  DepositLimit as DepositLimitType
} from "@brandserver-client/types";
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import * as React from "react";
import styled from "styled-components";
import { DepositBonus } from "./DepositBonus";
import { hasBonus, hasCampaign } from "../utils";
import { useDeposit } from "../context";
import { DepositLimit } from "./DepositLimit";

const StyledSplashScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 324px;
  width: 100%;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    justify-content: space-between;
    margin: auto;
    height: 100%;
  }

  @media screen and (min-width: 992px) {
    align-items: flex-start;
  }

  .deposit-bonus__main {
    width: 100%;
  }

  .deposit-bonus__block {
    &.block-campaign {
      margin-top: 10px;
    }

    &-title {
      ${props => props.theme.typography.text21BoldUpper};

      &.bonus-title {
        margin-bottom: 22px;
      }

      &.campaign-title {
        margin-bottom: 20px;
      }
    }

    &-limit {
      min-height: 20px;
      margin: 4px 0 4px 0;
    }
  }

  .deposit-bonus__button {
    margin-bottom: 15px;
  }
`;

const showLimit = (
  depositOption: CampaignOption | BonusOption,
  limit: DepositLimitType | undefined
) =>
  !!depositOption.minAmount &&
  !!limit &&
  depositOption.minAmount > limit.limitLeft / 100;

const SplashScreen = () => {
  const { Button } = useRegistry();
  const {
    campaignOptionValues,
    bonusOptionValues,
    deposit,
    onToggleSplashScreen,
    onCancelLimit,
    onToggleCampaignOptionValue,
    onToggleBonusOptionValue
  } = useDeposit();

  const messages = useMessages({
    continue: "my-account.deposit.continue"
  });

  const { limit, depositOptions } = deposit;

  return (
    <StyledSplashScreen>
      <div className="deposit-bonus__main">
        {hasBonus(depositOptions) && (
          <div className="deposit-bonus__block">
            <h2 className="deposit-bonus__block-title bonus-title">
              {depositOptions.bonus!.title}
            </h2>
            {depositOptions.bonus!.options.map(option => (
              <div key={option.id}>
                <DepositBonus
                  option={option}
                  type={DepositBonus.Type.bonus}
                  value={bonusOptionValues[option.id]}
                  onToggle={onToggleBonusOptionValue}
                />
                <div className="deposit-bonus__block-limit">
                  {showLimit(option, limit) && (
                    <DepositLimit
                      limit={limit!}
                      onCancelLimit={onCancelLimit}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {hasCampaign(depositOptions) && (
          <div className="deposit-bonus__block block-campaign">
            <h2 className="deposit-bonus__block-title campaign-title">
              {depositOptions!.campaign!.title}
            </h2>
            {(depositOptions!.campaign!.options as CampaignOption[]).map(
              option => (
                <div key={option.id}>
                  <DepositBonus
                    option={option}
                    value={campaignOptionValues[option.id]}
                    onToggle={onToggleCampaignOptionValue}
                  />
                  <div className="deposit-bonus__block-limit">
                    {showLimit(option, limit) && (
                      <DepositLimit
                        limit={limit!}
                        onCancelLimit={onCancelLimit}
                      />
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
      <Button
        className="deposit-bonus__button"
        color={Button.Color.accent}
        size={Button.Size.large}
        onClick={onToggleSplashScreen}
      >
        {messages.continue}
      </Button>
    </StyledSplashScreen>
  );
};

export { SplashScreen };
