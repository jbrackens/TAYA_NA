/* @flow */
export type CommunicationMethodStatus = 'unknown' | 'unverified' | 'verified' | 'failed';
export type RiskProfile = 'low' | 'medium' | 'high';

export type SowState = 'CLEAR' | 'FAIL' | 'PENDING';

export type PlayerCommon = {
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
  tcVersion: number,
  activated: boolean,
  placeOfBirth?: string,
  nationality?: string,
  additionalFields?: Object,
  affiliateRegistrationCode: string,
};

export type PlayerDraft = {
  password?: string,
  ipAddress: IPAddress,
  userAgent: string,
  allowSMSPromotions: boolean,
  allowEmailPromotions: boolean,
  registrationSource?: string,
  tcVersion?: number,
  mobilePhoneStatus?: CommunicationMethodStatus,
  emailStatus?: CommunicationMethodStatus,
  personId?: Id,
  ...PlayerCommon,
};

export type PlayerIdentifier = {
  id: number,
  brandId: BrandId,
};

export type Player = {
  username: string,
  brandId: BrandId,
  createdAt: Date,
  testPlayer: boolean,
  verified: boolean,
  ...PlayerCommon,
  ...PlayerIdentifier,
};

export type PlayerWithDetails = {
  ...Player,

  allowSMSPromotions: boolean,
  allowEmailPromotions: boolean,

  registrationSource: ?string,
  selfExclusionEnd: ?Date,
  numDeposits: number,
  accountClosed: boolean,
  accountSuspended: boolean,
  loginBlocked: boolean,
  allowGameplay: boolean,
  preventLimitCancel: boolean,
  allowTransactions: boolean,
  gamblingProblem: boolean,
  tags: string[],
  partial: boolean,
  pnp: boolean,
  dd: {
    flagged: boolean,
    locked: boolean,
    lockTime: ?Date,
  },
  realityCheckMinutes: number,
};

export type PlayerWithRisk = { ...PlayerWithDetails, potentialGamblingProblem: boolean };

export type PlayerDetailsUpdate = {
  email?: string,
  firstName?: string,
  lastName?: string,
  address?: string,
  postCode?: string,
  city?: string,
  countryId?: string,
  dateOfBirth?: Date | string,
  mobilePhone?: string,
  languageId?: string,
  nationalId?: string,
  allowEmailPromotions?: boolean,
  allowSMSPromotions?: boolean,
  tcVersion?: number,
  emailStatus?: 'unknown' | 'unverified' | 'verified' | 'failed',
  mobilePhoneStatus?: 'unknown' | 'unverified' | 'verified' | 'failed',
  placeOfBirth?: string,
  nationality?: string,
  additionalFields?: Object,
};
