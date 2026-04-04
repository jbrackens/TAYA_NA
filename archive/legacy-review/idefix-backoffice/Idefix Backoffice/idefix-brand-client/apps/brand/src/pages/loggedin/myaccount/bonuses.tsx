import * as React from "react";
import { Reward as Bonus } from "@brandserver-client/types";
import { withInitialProps } from "@brandserver-client/features/with-initial-props";
import { MyAccountPage } from "@brandserver-client/lobby";

import Bonuses from "../../../components/Bonuses";

interface Props {
  data: Bonus[] | undefined;
  isLoading: boolean;
}

const BonusesPage: MyAccountPage<Props, Bonus[]> = ({ data, isLoading }) => (
  <Bonuses bonuses={data} isLoading={isLoading} />
);

BonusesPage.fetchInitialProps = async ({ lobby }) => {
  const rewards = await lobby.api.rewards.getRewards();
  return rewards;
};

export default withInitialProps(BonusesPage);
