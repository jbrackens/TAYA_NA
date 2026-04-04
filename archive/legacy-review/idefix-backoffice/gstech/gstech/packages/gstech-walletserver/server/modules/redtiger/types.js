/* @flow */

export type AuthRequest = {
  token: string,
  casino: string,
  userId: string,
  currency: string,
  channel: string,
  affiliate: string,
};

export type AuthResponse = {
  success: boolean,
  result: {
    token: string,
    userId: string,
    currency: string,
    country: string,
    language: string,
    casino: string,
    balance: {
      cash: string,
      bonus: string,
    },
  },
};

export type StakeRequest = {
  token: string,
  userId: string,
  casino: string,
  currency: string,
  transaction: {
    id: string,
    stake: string,
    stakePromo: string,
    details: {
      game: string,
      jackpot: string,
    },
  },
  round: {
    id: number,
    starts: boolean,
    ends: boolean,
  },
  promo: {
    type: string,
    instanceCode: string,
    instanceId: number,
    campaignCode: string,
    campaignId: number,
  },
  game: {
    type: string,
    key: string,
    version: string,
  },
};

export type StakeResponse = {
  success: boolean,
  result: {
    token: string,
    id: number,
    currency: string,
    stake: {
      cash: string,
      bonus: string,
    },
    balance: {
      cash: string,
      bonus: string,
    },
  },
};

export type PayoutRequest = {
  token: string,
  userId: string,
  casino: string,
  currency: string,
  transaction: {
    id: string,
    payout: string,
    payoutPromo: string,
    details: {
      game: string,
      jackpot: string,
    },
    sources: {
      lines: string,
      features: string,
      jackpot: any,
    },
  },
  round: {
    id: number,
    starts: boolean,
    ends: boolean,
  },
  promo: {
    type: string,
    instanceCode: string,
    instanceId: number,
    campaignCode: string,
    campaignId: number,
  },
  game: {
    type: string,
    key: string,
    version: string,
  },
  jackpot: {
    group: string,
    contribution: string,
    pots: any,
  },
  retry: boolean,
};

export type PayoutResponse = {
  success: boolean,
  result: {
    token: string,
    id: number,
    payout: {
      cash: string,
      bonus: string,
    },
    currency: string,
    balance: {
      cash: string,
      bonus: string,
    },
  },
};

export type RefundRequest = {
  token: string,
  userId: string,
  casino: string,
  currency: string,
  transaction: {
    id: string,
    stake: string,
    stakePromo: string,
    details: {
      game: string,
      jackpot: string,
    },
  },
  round: {
    id: number,
    starts: boolean,
    ends: boolean,
  },
  promo: {
    type: string,
    instanceCode: string,
    instanceId: number,
    campaignCode: string,
    campaignId: number,
  },
  game: {
    type: string,
    key: string,
    version: string,
  },
};

export type RefundResponse = {
  success: boolean,
  result: {
    token: string,
    id: string,
    stake: {
      cash: string,
      bonus: string,
    },
    currency: string,
    balance: {
      cash: string,
      bonus: string,
    },
  },
};

export type ErrorInfo = {
  message: string,
  code: number,
};

export type ErrorResponse = {
  success: boolean,
  error: ErrorInfo,
};

export type LaunchGameResponse = {
  html?: string,
  parameters?: mixed,
  url?: string,
};

const errors = {
  API_AUTHENTICATION_ERROR: { code: 100, message: 'API authentication error' },
  INVALID_INPUT: { code: 200, message: 'Invalid Input' },
  GENERIC_ERROR: { code: 201, message: 'Generic error' },
  NOT_AUTHORIZED: { code: 301, message: 'Not authorized' },
  USER_NOT_FOUND: { code: 302, message: 'User not found' },
  BANNED_USER: { code: 303, message: 'Banned user' },
  INSUFFICIENT_FUNDS: { code: 304, message: 'Insufficient funds' },
  INVALID_USER_CURRENCY: { code: 305, message: 'Invalid user currency' },
  USER_LIMITED_PLAYING: { code: 306, message: 'User limited playing' },
  TRANSACTION_NOT_FOUND: { code: 400, message: 'Transaction not found' },
  DUPLICATED_TRANSACTION: { code: 401, message: 'Duplicated transaction' },
  INTERNAL_SERVER_ERROR: { code: 500, message: 'Internal server error' },
  UNDER_MAINTENANCE_MODE: { code: 501, message: 'Under maintenance mode' },
};

module.exports = {
  errors,
};
