import { useRouter } from "next/router";
import { useEffect } from "react";
import { CampaignOption } from "@brandserver-client/types";
import { useDeposit } from "../context";
import { hasCampaign } from "../utils";

function useSelectCampaignByQuery() {
  const { query } = useRouter();
  const {
    deposit: { depositOptions },
    onToggleSplashScreen,
    onToggleCampaignOptionValue
  } = useDeposit();

  useEffect(() => {
    if (!hasCampaign(depositOptions) || query.type !== "campaign") {
      return;
    }

    const campaignById = depositOptions.campaign!.options!.find(
      (option: CampaignOption) => option.id === query.id
    );

    if (!campaignById) {
      return;
    }

    onToggleCampaignOptionValue(query.id as string);
    onToggleSplashScreen();
  }, [query, depositOptions]);
}

export { useSelectCampaignByQuery };
