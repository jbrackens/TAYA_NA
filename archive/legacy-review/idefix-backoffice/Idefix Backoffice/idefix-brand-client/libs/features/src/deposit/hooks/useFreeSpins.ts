import * as React from "react";
import {
  FreeSpin,
  BonusOption,
  CampaignOption
} from "@brandserver-client/types";

interface Props {
  initialFreeSpins: FreeSpin[] | undefined;
  bonus: BonusOption | undefined;
  campaign: CampaignOption | undefined;
}

function useFreeSpins({
  initialFreeSpins,
  bonus,
  campaign
}: Props): FreeSpin[] {
  return React.useMemo(() => {
    if (bonus?.freespins) {
      return bonus.freespins;
    } else if (campaign?.freespins) {
      return campaign.freespins;
    } else if (initialFreeSpins) {
      return initialFreeSpins;
    } else {
      return [];
    }
  }, [initialFreeSpins, bonus, campaign]);
}

export { useFreeSpins };
