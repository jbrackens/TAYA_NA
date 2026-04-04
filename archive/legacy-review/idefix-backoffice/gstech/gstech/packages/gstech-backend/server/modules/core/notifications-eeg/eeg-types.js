// @flow

export type MessageType = 'PlayerRegistration' | 'PlayerUpdate' | 'PlayerDeposit' | 'PlayerWithdrawal';
export type EEGPaymentType = 'created' | 'pending' | 'accepted' | 'processing' | 'complete' | 'settled' | 'failed' | 'expired' | 'cancelled';

export type EEGPlayer = {
  playerId: Id,
  brandId: BrandId,
  username: string,
  email: string,
  firstName: string,
  lastName: string,
  address: string,
  postCode: string,
  city: string,
  mobilePhone: string,
  countryId: string,
  dateOfBirth: string,
  languageId: string,
  nationalId: ?string,
  currencyId: string,
  allowEmailPromotions: boolean,
  allowSMSPromotions: boolean,
  createdAt: number,
  activated: boolean,
  verified: boolean,
  selfExclusionEnd: ?number,
  allowGameplay: boolean,
  allowTransactions: boolean,
  loginBlocked: boolean,
  accountClosed: boolean,
  accountSuspended: boolean,
  numDeposits: number,
  testPlayer: boolean,
  gamblingProblem: boolean,
  tcVersion: number,
  partial: boolean,
  tags: string[],
  placeOfBirth: ?string,
  nationality: ?string,
  additionalFields: ?{},
  registrationSource: ?string,
};

export type EEGDeposit = {
  paymentId: Id,
  playerId: Id,
  accountId: ?Id,
  timestamp: number,
  transactionKey: string,
  status: EEGPaymentType,
  paymentParameters: ?mixed,
  accountParameters: ?mixed,
  counterId: ?number,
  counterTarget: ?number,
  counterValue: ?number,
  bonus: ?string,
  bonusId: ?Id,
  amount: number,
  paymentFee: ?number,
  paymentCost: ?number,
  paymentMethod: string,
  paymentProvider: string,
  index: ?number,
};

export type EEGWithdrawal = {
  paymentId: Id,
  playerId: Id,
  accountId: Id,
  account: string,
  timestamp: number,
  transactionKey: string,
  status: EEGPaymentType,
  amount: number,
  paymentParameters: ?mixed,
  accountParameters: ?mixed,
  paymentMethod: string,
  paymentProvider: ?string,
};

export type EEGPlayerRegistrationEvent = {
  createdDateUtc: number,
  messageType: MessageType,
  customerId: string,
  payload: {
    'com.idefix.events.PlayerRegistration': {
      player: EEGPlayer,
    },
  },
};

export type EEGPlayerUpdateEvent = {
  createdDateUtc: number,
  messageType: MessageType,
  customerId: string,
  payload: {
    'com.idefix.events.PlayerUpdate': {
      player: EEGPlayer,
    },
  },
};

export type EEGPlayerDepositEvent = {
  createdDateUtc: number,
  messageType: MessageType,
  customerId: string,
  payload: {
    'com.idefix.events.PlayerDeposit': {
      player: EEGPlayer,
      deposit: EEGDeposit,
    },
  },
};

export type EEGPlayerWithdrawalEvent = {
  createdDateUtc: number,
  messageType: MessageType,
  customerId: string,
  payload: {
    'com.idefix.events.PlayerWithdrawal': {
      player: EEGPlayer,
      withdrawal: EEGWithdrawal,
    },
  }
};

export type EEGEvent = EEGPlayerRegistrationEvent | EEGPlayerUpdateEvent | EEGPlayerDepositEvent | EEGPlayerWithdrawalEvent;
