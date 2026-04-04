/* @flow */
export type CommunicationMethodStatus = 'unknown' | 'unverified' | 'verified' | 'failed';

export type PlayerCommon = {|
  brandId: BrandId,
  nationalId: ?string,
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
  currencyId: string,
  createdAt: Date,
  testPlayer: boolean,
  tcVersion: number,
|};

export type PlayerDraft = {|
  password?: string,
  affiliateRegistrationCode: string,
  ipAddress: IPAddress,
  userAgent: string,
  allowSMSPromotions: boolean,
  allowEmailPromotions: boolean,
  registrationSource?: string,
  tcVersion?: number,
  mobilePhoneStatus?: CommunicationMethodStatus,
  emailStatus?: CommunicationMethodStatus,
  ...PlayerCommon,
|};

export type PlayerIdentifier = {|
  id: number,
  brandId: BrandId,
|};

export type Player = {|
  username: string,
  ...PlayerCommon,
  ...PlayerIdentifier,
|};

export type PlayerWithDetails = {|
  ...Player,

  allowSMSPromotions: boolean,
  allowEmailPromotions: boolean,

  selfExclusionEnd: ?Date,
  numDeposits: number,
  activated: boolean,
  accountClosed: boolean,
  accountSuspended: boolean,
  verified: boolean,
  loginBlocked: boolean,
  allowGameplay: boolean,
  allowTransactions: boolean,
  gamblingProblem: boolean,
  tags: string[],
  partial: boolean,
  dd: {
    flagged: boolean,
    locked: boolean,
    lockTime: ?Date,
  },
|};
