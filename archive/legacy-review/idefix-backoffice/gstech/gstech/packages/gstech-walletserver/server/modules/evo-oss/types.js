/* @flow */

export type CheckUserRequest = {
  userId: string,
  sid: string,
  channel: {
    type: string,
  },
  uuid: string,
};

export type CheckUserResponse = {
  status: string,
  sid: string,
  uuid: string,
};

export type BalanceRequest = {
  userId: string,
  sid: string,
  currency: string,
  game: {
    type: string,
    details: {
      table: {
        id: string,
        vid: string,
      },
    },
  },
  uuid: string,
};

export type StandardResponse = {
  status: string,
  balance?: number,
  bonus?: number,
  retransmission?: Boolean,
  uuid: string,
};

export type DebitRequestJackpot = {
  id: string,
  contributionAmount: number,
  contributions: {
    pot: 'top' | 'fixed' | 'reserve',
    amount: number,
  }[],
};

export type DebitRequest = {
  sid: string,
  userId: string,
  currency: string,
  game: {
    id: string,
    type: string,
    details: {
      table: {
        id: string,
        vid: string,
      },
    },
  },
  transaction: {
    id: string,
    refId: string,
    amount: number,
    jackpots: DebitRequestJackpot[]
  },
  uuid: string,
};

export type CreditOrCancelRequestJackpot = {
  id: string,
  winAmount: number,
};

export type CreditRequest = {
  sid: string,
  userId: string,
  currency: string,
  game: {
    id: string,
    type: string,
    details: {
      table: {
        id: string,
        vid: string,
      },
    },
  },
  transaction: {
    id: string,
    refId: string,
    amount: number,
    jackpots: CreditOrCancelRequestJackpot[]
  },
  uuid: string,
};

export type CancelRequest = {
  sid: string,
  userId: string,
  currency: string,
  game: {
    id: string,
    type: string,
    details: {
      table: {
        id: string,
        vid: string,
      },
    },
  },
  transaction: {
    id: string,
    refId: string,
    amount: number,
    jackpots: CreditOrCancelRequestJackpot[]
  },
  uuid: string,
};

type FreeRoundPlayableSpentPromoTx = {
  id: string,
  amount: number,
  voucherId: string,
  remainingRounds: 0,
  type: 'FreeRoundPlayableSpent',
};

export type PromoRequest = {
  sid: string,
  userId: string,
  currency: string,
  game: ?{
    id: string,
    type: string,
    details: {
      table: {
        id: string,
        vid: string,
      },
    },
  },
  promoTransaction: FreeRoundPlayableSpentPromoTx,
  uuid: string,
};

export type TransactionItem = {
  amount: number,
  gameId: string,
  tableId: string,
  gameType: string,
  transactionId: string,
};

export type Envelope = {
  transmissionId: string,
  event: {
    timestamp: Date,
    correlationId: string,
    payload: {
      VoucherIssued?: {
        voucherId: string,
        playerId: string,
        currency: string,
        winningSettings: {
          initialBalance: number,
          maxWinnings: number,
        },
        lifeTime: {
          issuedAt: Date,
          expirationDuration: string,
        },
      },
      VoucherClosed?: {
        voucherId: string,
        playerId: string,
        playable: number,
        winnings: number,
        reason: string,
      },
      BalanceChanged?: {
        voucherId: string,
        reason: {
          Withdraw?: TransactionItem,
          Deposit?: TransactionItem,
          Cancel?: TransactionItem,
        },
      },
    },
  },
};

export type AuthenticationResponse = {
  entry: any,
  entryEmbedded: any,
};

type TableGameSelection =
  | {
      tableIds: string[],
      $type: 'ParticularTables',
    }
  | {
      $type: 'Non',
    };

type TableSettings = {
  forAll: TableGameSelection,
  forDesktopOnly: TableGameSelection,
  forMobileOnly: TableGameSelection,
};

type Sites =
  | {
      value?: string[],
      $type: 'SomeSet',
    }
  | {
      $type: 'All',
    };

type TimeInterval = {
  start: Date,
  end: Date,
};

export type CampaignInfo = {
  title: string,
  shortTerms?: string,
  termsAndConds?: string,
  timezone: string,
  campaignInterval: TimeInterval,
  tableSettings: TableSettings,
  sites: Sites,
  expirationDuration: string,
};

type PrimaryKey = {
  campaignId: UUID,
  casinoId: string,
  version: number,
};

type CampaignState = 'Draft' | 'Active' | 'Expired' | 'Cancelled' | 'Forfeited';

type CampaignPayload = {
  state: CampaignState,
  createdAt: Date,
  updatedAt: Date,
  info: CampaignInfo,
};

export type Campaign = {
  pk: PrimaryKey,
  payload: CampaignPayload,
};

type FreeRoundsSettings = {
  freeRoundsCount: number,
  betAmount: number,
  $type: 'freeRounds',
};

type MonetaryVoucherSettings = {
  initialBalance: number,
  maxWinnings: number,
  $type: 'monetary',
};

type VoucherSettings = FreeRoundsSettings | MonetaryVoucherSettings;

export type NewVoucherInfo = {
  playerId: string,
  currency: string,
  settings: VoucherSettings,
};

type VoucherPlayerInfo = {
  externalId: string,
  casinoId: string,
};

type VoucherPrimaryKey = {
  voucherId: UUID,
  playerId: VoucherPlayerInfo,
};

type VoucherLifetime = {
  issuedAt: string,
  expirationDuration: string,
};

type VoucherState =
  | 'Active'
  | 'Expired'
  | 'Canceled'
  | 'WinCapReached'
  | 'PlayableSpent'
  | 'Forfeited'
  | 'MinBetLimitReached';

type MonetaryBalanceInfo = {
  playable: number,
  winnings: number,
  $type: 'monetary',
};

type FreeRoundsBalanceInfo = {
  playable: number,
  winnings: number,
  $type: 'freeRounds',
};

type VoucherBalanceInfo = MonetaryBalanceInfo | FreeRoundsBalanceInfo;

export type PlayerVoucher = {
  pk: VoucherPrimaryKey,
  campaignId: UUID,
  currency: string,
  lifetime: VoucherLifetime,
  state: VoucherState,
  settings: VoucherSettings,
  balance: VoucherBalanceInfo,
};

export type CloseReason = 'Canceled' | 'Forfeited';

export type TableBetAmountsBody = {
  forAll: TableGameSelection,
  forDesktopOnly: TableGameSelection,
  forMobileOnly: TableGameSelection,
  sites?: Sites,
};

type SingleTableBetAmounts = {
  tableId: string,
  betAmounts: number[],
};

export type CasinoBetAmounts = {
  desktop: SingleTableBetAmounts[],
  mobile: SingleTableBetAmounts[],
};

export type EvolutionJackpotAmounts = {
  jackpotId: string,
  gameProvider: string,
  skinIds: string[],
  amount: {
    [currency: string]: number,
  },
};
