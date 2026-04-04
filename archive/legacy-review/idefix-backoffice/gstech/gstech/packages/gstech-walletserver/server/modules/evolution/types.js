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
  },
  uuid: string,
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
  },
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
