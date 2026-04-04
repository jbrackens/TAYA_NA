import * as React from "react";
import { DepositOptions } from "@brandserver-client/types";
import { setInitialDepositOptionValues } from "../utils";

function useCampaign(depositOptions: DepositOptions) {
  const [campaignOptionValues, setCampaignValues] = React.useState(
    setInitialDepositOptionValues(depositOptions.campaign?.options)
  );

  const campaign = React.useMemo(
    () =>
      depositOptions.campaign?.options?.find(
        option => campaignOptionValues[option.id]
      ),
    [campaignOptionValues, depositOptions]
  );

  const onToggleCampaignOptionValue = React.useCallback(
    (optionId: string) =>
      setCampaignValues((prevValues: { [key: string]: boolean }) => ({
        ...prevValues,
        [optionId]: !prevValues[optionId]
      })),
    []
  );

  return { campaign, campaignOptionValues, onToggleCampaignOptionValue };
}

export { useCampaign };
