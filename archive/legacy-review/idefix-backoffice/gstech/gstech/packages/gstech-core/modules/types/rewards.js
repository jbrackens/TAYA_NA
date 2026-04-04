/* @flow */

export type CreditType =
  | 'freeSpins'
  | 'real'
  | 'bonus'
  | 'depositBonus'
  | 'physical'
  | 'wheelSpin'
  | 'markka'
  | 'gold'
  | 'iron'
  | 'lootBox'
  | 'progress'
  | 'cash';

export type CasinoCurrency = 'markka' | 'gold' | 'iron';
export type RewardType = 'bountyCycle' | CasinoCurrency | 'rewardCycle' | 'wheelSpin' | 'shopItem' | 'lootBoxContent' | 'wheelSpinContent' | 'bounty' | 'campaignShopItem' | 'rewardCycleHighrollers' | 'retentionCycle' | 'affiliateReward' | 'extraReward' | 'shopItemV2' | 'otherBounty' | 'affiliateBounty' | 'bountyCycleHighrollers' | 'campaignBounty' | 'reward';
export type RewardGroup = 'bounty' | 'shopItems' | 'coins' | 'reward' | 'shopItemsV2' | 'wheelSpin';

export type RawReward = {
  id: string,
  type: string,
  credit: string,
  bonusCode: string,
  game: string,
  action: string,
  description: string,
  backups?: RawReward[],
  backup: boolean,
  label: string,
  parentRewardId?: Id,
  creditOnce?: boolean,
  validity?: number,
  value: number,
  price: number,
  cost: Money,
  spins: number,
  spinValue: Money,
  spintype: string,
  order: number,
  currency: CasinoCurrency,
};

export type RewardDefinitionDraft = {
  rewardType: RewardType,
  brandId: BrandId,
  promotion?: ?string,
  internal?: boolean,
  initialize?: boolean,
  followUpdates?: boolean,
  order?: number,
};

export type RewardDefinition = { id: Id, ...RewardDefinitionDraft };

export type RewardDraft = {
  rewardDefinitionId: Id,
  creditType: CreditType,
  bonusCode: string,
  description: string,
  externalId: string,
  metadata?: { [key: string]: any },
  validity?: ?number,
  price?: ?number,
  cost?: Money,
  spins?: ?number,
  spinValue?: ?Money,
  spinType?: ?string,
  order?: number,
  gameId?: ?Id,
  currency?: ?CasinoCurrency,
  removedAt?: ?Date,
  active?: boolean,
};

export type Reward = {
  id: Id,
  ...RewardDraft,
  metadata: { [key: string]: any },
  cost: Money,
  order: number,
};

export type RewardUpdate = Partial<RewardDraft>;

export type Thumbnail = {
  id: number,
  brandId: BrandId,
  key: string,
  blurhashes: { [key: string]: string },
  viewModes: string[],
};

export type GameDraft = {
  order: number,
  brandId: BrandId,
  permalink: string,
  name: string,
  manufacturer: string,
  primaryCategory: string,
  aspectRatio: '16x9' | '4:3' | '3x2' | 'wms-wide',
  viewMode: 'single' | 'max',
  newGame?: boolean,
  jackpot?: boolean,
  promoted: boolean,
  thumbnailId?: ?number,
  searchOnly?: boolean,
  active?: boolean,
  keywords?: string,
  tags?: string[],
  parameters?: ?{ [key: string]: any },
  removedAt?: ?Date,
  dropAndWins: boolean,
};

export type GameUpdate = Partial<GameDraft>;

export type Game = { id: Id, ...GameDraft };

export type GameWithThumbnail = { thumbnail: string, ...Game };

export type GameWithThumbnailData = {
  game: Game,
  thumbnail: Thumbnail,
};

export type LedgerSource = 'marketing' | 'wagering' | 'manual' | 'exchange';
export type LedgerDraft = {
  rewardId: Id,
  rewardDefinitionId: Id,
  playerId: Id,
  creditDate: Date,
  source: LedgerSource,
  useDate?: ?Date,
  externalId?: ?string,
  expires?: ?Date,
};

export type Ledger = {
  id: Id,
  ...LedgerDraft,
};

export type LedgerEventDraft = {
  event: string,
  comment?: string,
  userId?: number,
  parameters?: {
    externalRewardId?: string,
  },
};

export type LedgerEvent = {
  id: Id,
  event: string,
  comment: string,
  parameters?: {
     userId?: Id
  },
};

export type ProgressDraft = {
  rewardDefinitionId: Id,
  ledgerId?: Id,
  playerId: Id,
  betCount: number,
  contribution: Money,
  cumulativeContribution: Money,
  perRewardDefinitionCount: number,
  target: Money,
  startedAt?: Date | string,
  completedAt?: Date | string,
  updatedAt?: Date | string,
  multiplier: number,
};

export type Progress = {
  id: Id,
} & ProgressDraft;
export type ProgressWithDetails = {
  progress: number,
  multiplier: number,
  // eslint-disable-next-line no-use-before-define
  rewards: { quantity: number, ...RewardWithGame }[],
  rewardDefinitionId: Id,
  rewardType: RewardType,
  betCount: number,
  contribution: number,
  target: number,
  startedAt: Date,
  updatedAt: Date,
};

export type ProgressRewardDraft = {
  rewardId: Id,
  progressId: Id,
  playerId: Id,
};

export type ProgressReward = { id: Id, ...ProgressRewardDraft };

export type GameProgressDraft = {
  progressId: Id,
  permalink: string,
  betCount: number,
  betAmount: Money,
  winAmount: Money,
};

export type GameProgress = {
  id: Id,
} & GameProgressDraft;

export type RewardWithGame = {
  game?: GameWithThumbnail,
  reward: Reward,
};

export type LedgerWithRewardAndGame = {
  id: Id,
  creditDate: Date,
  useDate: Date,
  expires: Date,
  externalId: string,
  result: ?string,
  groupId: number,
  quantity: number,
  events?: LedgerEvent[],
  ...RewardWithGame,
};

export type RewardWithLedgerId = { ledgerId: Id, brandId?: BrandId, ...Reward };

export type ImportLedgersData = { id: string, rewardid: string, used: boolean, usedTime: ?string, timestamp: ?string }[];

export type PlayerBalance = {
  [key: CasinoCurrency]: {
    rewardDefinitionId: Id,
    total: number,
    credited: number,
    used: number,
  },
};