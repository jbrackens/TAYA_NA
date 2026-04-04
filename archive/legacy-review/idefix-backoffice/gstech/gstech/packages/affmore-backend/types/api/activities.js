/* @flow */
export type GetAffiliateActivitiesAdminRequest = {
  params: {
    affiliateId: Id,
  },
  query: {
    from: string, // TODO: mandatory values rather should be params
    to: string,
    brandId?: BrandId,
  },
};

export type GetAffiliateActivitiesRequest = {
  session: {
    affiliateId: Id,
  },
  query: {
    from: string, // TODO: mandatory values rather should be params
    to: string,
    brandId?: BrandId,
  },
};

export type GetAffiliateActivitiesResponse = {
  activities: {
    items: {
      link: string,
      linkId: Id,
      segment: ?string,
      brandId: BrandId,
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
      commission: Money,
      cpa: Money,
    },
    total: Money,
  },
};
