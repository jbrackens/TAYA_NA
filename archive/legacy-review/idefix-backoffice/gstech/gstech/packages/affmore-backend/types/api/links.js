// @flow
import type { LinkDraft } from '../repository/links';
import type { UserWithRoles } from '../repository/auth';

export type AffiliateLink = {
  linkId: Id,
  planId: ?Id,
  brandId: BrandId,
  code: string,
  name: string,
  landingPage: string,
  deal: ?string,
};

export type CreateAffiliateLinkAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
  link: LinkDraft,
};

export type GetAffiliateLinksAdminRequest = {
  params: {
    affiliateId: Id,
  },
  query: {
    brandId?: BrandId,
  },
};

export type GetAffiliateLinkClicksAdminRequest = {
  params: {
    affiliateId: Id,
    linkId: Id,
  },
  query: {
    from: string, // TODO: maybe need type alias for format yyyy-MM-dd
    to: string,
  },
};

export type UpdateAffiliateLinkAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    linkId: Id,
  },
  link: LinkDraft,
};

export type DeleteAffiliateLinkAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    linkId: Id,
  },
};

export type CreateAffiliateLinkResponse = {
  link: AffiliateLink,
};

export type GetAffiliateLinksResponse = {
  links: AffiliateLink[],
};

export type GetAffiliateLinkClicksResponse = {
  clicks: {
    items: {
      date: string, // day
      segment: string,
      clicks: number | 'N/A',
      nrc: number,
      ndc: number,
      deposits: Money,
      turnover: Money,
      grossRevenue: Money,
      netRevenue: Money,
      commission: Money,
      cpa: Money,
    }[],
    totals: {
      clicks: number | 'N/A',
      nrc: number,
      ndc: number,
      deposits: Money,
      turnover: Money,
      grossRevenue: Money,
      netRevenue: Money,
      cpa: Money,
      commission: Money,
    },
    total: Money,
  },
};

export type UpdateAffiliateLinkResponse = {
  link: AffiliateLink,
};

export type DeleteAffiliateLinkResponse = OkResult;
