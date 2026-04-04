import { FC } from "react";
import {
  BonusOption,
  DepositOption,
  DepositOptions
} from "@brandserver-client/types";
import { DepositOptionIcon } from "@brandserver-client/types";
import {
  WheelIcon,
  CoinsIcon,
  BountyIcon,
  RewardBoxIcon,
  FreeSpinIcon
} from "@brandserver-client/icons";
import mapValues from "lodash/mapValues";
import keyBy from "lodash/keyBy";
import { DirectaProviders } from "./types";

const DepositBonusIcons: {
  [key: string]: FC<React.SVGAttributes<SVGSVGElement>>;
} = {
  coins: CoinsIcon,
  bounty: BountyIcon,
  reward: RewardBoxIcon,
  freeSpin: FreeSpinIcon,
  wheel: WheelIcon
};

const getDepositBonusIcon = (icon: DepositOptionIcon) => {
  return DepositBonusIcons[icon];
};

function hasBonus(depositOptions: DepositOptions): boolean {
  return !!depositOptions?.bonus;
}

function hasCampaign(depositOptions: DepositOptions): boolean {
  return !!depositOptions?.campaign;
}

function setInitialDepositOptionValues(options: DepositOption[] | undefined) {
  if (!options) {
    return {};
  }

  return mapValues(keyBy(options, "id"), item => item.toggle === "on");
}

function getMinDepositLimit(
  minDeposit: undefined | number,
  lowerLimit: number
) {
  if (!minDeposit) {
    return lowerLimit;
  }

  return Math.max(minDeposit, lowerLimit);
}

function calculateBonus(amount: number, bonus: BonusOption) {
  if (bonus.minAmount && amount >= bonus.minAmount) {
    return Math.min(bonus.maxAmount, amount * bonus.percentage);
  }

  return 0;
}

function isDirectaProvider(id: string) {
  return Object.values(DirectaProviders).includes(id as DirectaProviders);
}

export {
  hasBonus,
  hasCampaign,
  getDepositBonusIcon,
  setInitialDepositOptionValues,
  getMinDepositLimit,
  calculateBonus,
  isDirectaProvider
};
