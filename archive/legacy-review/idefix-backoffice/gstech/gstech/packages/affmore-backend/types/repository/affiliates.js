// @flow
import type { ActivityData } from '../common';

export type AffiliateContactDetails = {
  contactName: string,
  email: string,
  countryId: CountryId,
  address: ?string,
  phone: ?string,
  skype: ?string,
  vatNumber: ?string,
  info: ?string,
  allowEmails: boolean,
};

export type PaymentMethod = 'banktransfer' | 'skrill' | 'casinoaccount';

export type PaymentMethodDetails = {
  bankAccountHolder?: string,
  bankIban?: string,
  bankBic?: string,
  bankClearingNumber?: string,
  bankName?: string,
  bankAddress?: string,
  bankPostCode?: string,
  bankCountry?: string,
  skrillAccount?: string,
  casinoAccountEmail?: string,
};

export type AffiliateUpdateDraft = {
  name: string,

  ...AffiliateContactDetails,

  paymentMinAmount: Money,
  paymentMethod: PaymentMethod,
  paymentMethodDetails: PaymentMethodDetails,
};

export type AffiliateAdminUpdateDraft = {
  ...AffiliateUpdateDraft,

  floorBrandCommission: boolean,
  allowNegativeFee: boolean,
  allowPayments: boolean,
  isInternal: boolean,
  isClosed: boolean,
  userId: ?Id,
  masterId: ?Id,
};

export type InsertAffiliateDraft = {
  hash: string,
  salt: string,

  tcVersion: number,
  ...AffiliateAdminUpdateDraft,
};

export type Affiliate = {
  id: Id,

  ...InsertAffiliateDraft,

  accountBalance: Money,
  createdAt: Date,
  updatedAt: Date,
  lastLoginDate: Date,

  apiToken: ?string,
};

export type AffiliateOverview = {
  id: Id,
  floorBrandCommission: boolean,
  registeredPlayers: number,
  depositingPlayers: number,
  activePlayers: number,
  newRegisteredPlayers: number,
  newDepositingPlayers: number,
  conversionRate: number,
  netRevenue: Money,
  deposits: Money,
  commission: Money,
  commissions: { [BrandId]: Money },
  cpa: Money,
  balance: Money,
};

export type Revenue = {
  affiliateId: Id,
  playerId: Id,
  planId: Id,
  countryId: CountryId,
  brandId: BrandId,
  deal: string,
  link: string,
  clickDate: Date,
  referralId: ?string,
  segment: ?string,
  registrationDate: Date,
  ...ActivityData,
  commissions: { [BrandId]: Money },
};

export type SubAffiliateDraft = {
  parentId: Id,
  affiliateId: Id,
  commissionShare: number,
};

export type SubAffiliate = {
  id: Id,
  ...SubAffiliateDraft,
};
