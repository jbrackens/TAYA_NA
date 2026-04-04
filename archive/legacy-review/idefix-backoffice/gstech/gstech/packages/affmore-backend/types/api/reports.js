/* @flow */

export type CombinedReportRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    brandNumber: number,
    year: number,
    month: number,
  },
};

export type MediaReportRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    brandNumber: number,
    code: string,
    year: number,
    month: number,
  },
};

export type MediaReportResponse = {
  dates: {
    activityDate: string, // day
    clicks: number,
    registrations: number,
    firstDeposits: number,
    tags: string[],
    deposits: string,
    turnover: string,
    grossRevenue: string,
    bonuses: string,
    adjustments: string,
    fees: string,
    tax: string,
    taxRate: string,
    netRevenue: string,
    commission: string,
    cpa: string,
    cpaCount: number,

  }[],
  totals: {
    clicks: number,
    registrations: number,
    firstDeposits: number,
    fees: string,
    tax: string,
    netRevenue: string,
    commission: string,
    commissionAfterTax: string,
    cpa: string,
    cpaCount: number,
    total: string,
  },
};

export type CombinedReportResponse = {
  id: UUID,
  name: string,
  tags: string[],
  report: MediaReportResponse,
}[];
