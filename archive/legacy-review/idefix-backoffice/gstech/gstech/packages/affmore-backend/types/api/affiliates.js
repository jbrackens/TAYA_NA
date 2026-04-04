// @flow
import type { AffiliateContactDetails, PaymentMethod, PaymentMethodDetails, AffiliateUpdateDraft } from '../repository/affiliates';
import type { LinkDraft } from '../repository/links';

export type AffiliateProfile = {
  affiliateId: Id,
  affiliateName: string,

  ...AffiliateContactDetails,

  paymentMinAmount: Money,
  paymentMethod: PaymentMethod,
  paymentMethodDetails: PaymentMethodDetails,

  createdAt: Date,
  updatedAt: Date,

  lastLoginDate: Date,
};

export type GetAffiliateRequest = {
  session: {
    affiliateId: Id,
  },
};

export type UpdateAffiliateRequest = {
  session: {
    affiliateId: Id,
  },
  affiliate: AffiliateUpdateDraft,
};

export type GetAffiliateOverviewRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    year: number,
    month: number,
  },
};

export type GetAffiliatePlayersRevenuesRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    year?: number,
    month?: number,
  },
  query: {
    brandId: BrandId,
  },
};

export type GetAffiliateDealsRequest = {
  session: {
    affiliateId: Id,
  },
};

export type CreateAffiliateLinkRequest = {
  session: {
    affiliateId: Id,
  },
  link: LinkDraft,
};

export type GetAffiliateLinksRequest = {
  session: {
    affiliateId: Id,
  },
  query: {
    brandId?: BrandId,
  },
};

export type GetAffiliateLinkClicksRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    linkId: Id,
  },
  query: {
    from: string,
    to: string,
  },
};

export type UpdateAffiliateLinkRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    linkId: Id,
  },
  link: LinkDraft,
};

export type DeleteAffiliateLinkRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    affiliateId: Id,
    linkId: Id,
  },
};

export type GetAffiliatePlayerActivitiesRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    playerId: Id,
    year: number,
    month: number,
  },
};

export type GetAffiliatePaymentsRequest = {
  session: {
    affiliateId: Id,
  },
};

export type GetSubAffiliatesRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    year: number,
    month: number,
  },
};

export type GetAffiliateAPIKeyRequest = {
  session: {
    affiliateId: Id,
  },
};

export type GetAffiliateAPITokenRequest = {
  session: {
    affiliateId: Id,
  },
};

export type RefreshAffiliateAPITokenRequest = {
  session: {
    affiliateId: Id,
  },
};

// TODO: requests and responses should have a wrapper object
export type GetAffiliateResponse = {
  ...AffiliateProfile,
  allowPayments: boolean,
  accountBalance: Money,
};

export type UpdateAffiliateResponse = {
  ...AffiliateProfile,
  accountBalance: Money,
};

export type GetAffiliateOverviewResponse = {
  nrc: {
    current: number,
  },
  ndc: {
    current: number,
  },
  conversionRate: {
    current: number,
  },
  monthlyCommission: {
    current: Money,
  },

  registeredCustomers: number,
  depositingCustomers: number,
  activePlayers: number,

  netRevenue: Money,
  cpa: Money,
  commission: Money,

  accountBalance: Money,
};

export type GetAffiliatesOverviewResponse = {
  affiliates: {
    affiliateId: Id,
    activePlayers: number,
    registeredPlayers: number,
    depositingPlayers: number,
    newRegisteredPlayers: number,
    newDepositingPlayers: number,
    conversionRate: number,
    netRevenue: Money,
    deposits: Money,
    commission: Money,
    cpa: Money,
    balance: Money,
  }[],
  totals: {
    activePlayers: number,
    registeredPlayers: number,
    depositingPlayers: number,
    newRegisteredPlayers: number,
    newDepositingPlayers: number,
    netRevenue: Money,
    deposits: Money,
    commission: Money,
    cpa: Money,
    balance: Money,
  },
  total: Money,
};

export type GetSubAffiliatesResponse = {
  affiliates: {
    items: {
      affiliateId: Id,
      affiliateName: string,
      commissionShare: number,
      nrc: number,
      ndc: number,
      registeredCustomers: number,
      depositingCustomers: number,
      netRevenue: Money,
      commission: Money,
    }[],
    totals: {
      nrc: number,
      ndc: number,
      registeredCustomers: number,
      depositingCustomers: number,
      netRevenue: Money,
      commission: Money,
    },
    total: Money,
  },
};

export type GetAffiliateAPITokenResponse = {
  apiToken: ?string,
};

export type RefreshAffiliateAPITokenResponse = {
  apiToken: string,
};
