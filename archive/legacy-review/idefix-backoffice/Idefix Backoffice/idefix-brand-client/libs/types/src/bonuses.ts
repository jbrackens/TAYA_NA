import { DepositOption } from "./deposit";
import { Update } from "./player";

export interface FreeSpin {
  spincount: number;
  spintype?: string;
  image?: string;
  limitAmount?: string;
  limit: number;
  count?: number;
}

export interface Campaign {
  title: string;
  options?: CampaignOption[];
}

export interface BonusOption extends DepositOption {
  bonusId?: number;
  campaignId?: number;
  maxAmount: number;
  percentage: number;
}

export type CampaignOption = DepositOption;

export type AvailableBonus = {
  activeBonus: string;
  bonusMaxAmount: string;
  bonusMaxValue: string;
  bonusMinAmount: string;
  bonusPercentage: string;
  id: number;
  maxAmount: number;
  maxBonus: number;
  minAmount: number;
  percentage: number;
};

// Casino Jefe
export interface JefeWheel {
  level: number;
  content: {
    title: string;
    body: string;
  };
  update: Update;
}

export interface JefeSpinWheel {
  bounty: {
    type: string;
    spintype: string;
    spins: number;
    bounty: string;
    game: string;
    bonusCode: string;
  } | null;
  html: string;
  morespins: boolean;
}

export interface JefeLevels {
  id: string;
  unread: boolean;
  important: boolean;
  action: string;
  image: string;
  title: string;
  content: string;
  disclaimer: string;
  actiontext: string;
  openOnLogin: boolean;
}

export interface JefeBounty {
  bounty: string;
  id: string;
  bounty_image: string;
  bountyid: string;
  action: string;
  locked: string;
  mobile: boolean;
  type: string;
}

// Luckydino
export interface Reward {
  action: string;
  id: string;
  rewardid: string;
  thumbnail: string;
  type: string;
}

// Kalevala + Olaspill
export interface ShopItem {
  description: string;
  locked: boolean;
  id: string;
  game: string;
  action: string;
  spins: number;
  type: string;
  price: number;
  currency: string;
  spintype: string;
  value: string;
}

export interface Bonus {
  title: string;
  options: BonusOption[];
}
