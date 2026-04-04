export interface RewardGroup {
  groupId: string;
  groupName: string;
  rewardTypes: string[];
  balanceGroup?: boolean;
  table: { title: string; property: string; type?: string }[];
}

export type RewardInitialGroups = Record<string, RewardGroup[]>;

export interface RewardProgress {
  betCount: string;
  contribution: number;
  progress: number;
  rewardType: string;
  rewards: { reward: { id: string; externalId: string; description: string } }[];
  startedAt: string;
  target: number;
  updatedAt: string;
}

export interface Reward {
  reward: {
    id: number;
    rewardDefinitionId: number | null;
    creditType: string;
    bonusCode: string;
    externalId: string;
    cost: number;
    currency: null;
    description: string;
    gameId: number;
    metadata: { [key: string]: string };
    order: number;
    price: number;
    spinType: string;
    spinValue: number;
    spins: string;
    validity: null | string;
    removedAt: null | string;
    active: boolean;
  };
  game: {
    id: number;
    active: boolean;
    order: number;
    brandId: string;
    permalink: string;
    name: string;
    manufacturer: string;
    primaryCategory: string;
    aspectRatio: string;
    viewMode: string;
    thumbnailId: number | null;
    parameters: unknown;
    newGame: boolean;
    keywords: string;
    jackpot: boolean;
    searchOnly: boolean;
    tags: string[];
    removedAt: string | null;
  };
}
