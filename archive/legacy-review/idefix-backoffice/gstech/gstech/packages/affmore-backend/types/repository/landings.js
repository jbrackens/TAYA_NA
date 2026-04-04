/* @flow */

export type LandingDraft = {
  brandId: BrandId,
  landingPage: string,
};

export type Landing = {
  id: Id,

  ...LandingDraft,

  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};

export type LandingWithStatistics = {
  ...Landing,
  usages: number,
};
