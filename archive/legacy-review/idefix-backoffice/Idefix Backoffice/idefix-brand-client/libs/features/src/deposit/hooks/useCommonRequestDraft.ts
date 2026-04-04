import * as React from "react";
import { CampaignOption } from "@brandserver-client/types";
import { useDeposit } from "../context";
import { hasCampaign } from "../utils";

function useCommonRequestDraft() {
  const { bonus, deposit, selectedDepositMethod, campaignOptionValues } =
    useDeposit();

  const { depositOptions } = deposit;

  const getCommonRequestDraft = React.useCallback(
    (amount: number) => {
      const campaignIds = hasCampaign(depositOptions)
        ? (depositOptions.campaign!.options as CampaignOption[])
            .filter(option => campaignOptionValues[option.id])
            .map(option => option.id)
        : [];

      return {
        amount,
        paymentMethod: selectedDepositMethod.name,
        currency: selectedDepositMethod.currencyISO,
        paymentAccountId:
          selectedDepositMethod && selectedDepositMethod.accountId
            ? selectedDepositMethod.accountId
            : null,
        bonusRuleID: bonus ? bonus.bonusId : -1,
        campaignIds:
          bonus && bonus.campaignId
            ? [...campaignIds, bonus.campaignId]
            : campaignIds
      };
    },
    [selectedDepositMethod, depositOptions, bonus, campaignOptionValues]
  );

  return { getCommonRequestDraft };
}

export { useCommonRequestDraft };
