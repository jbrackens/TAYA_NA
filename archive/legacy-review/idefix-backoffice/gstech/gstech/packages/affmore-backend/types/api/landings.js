// @flow
import type { LandingDraft } from '../repository/landings';
import type { UserWithRoles } from '../repository/auth';

export type AffiliateLanding = {
  landingId: Id,

  brandId: BrandId,
  landingPage: string,

  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};

export type CreateLandingRequest = {
  session: {
    user: UserWithRoles,
  },
  landing: LandingDraft,
};

export type GetLandingsRequest = {
  params: {
    brandId?: BrandId,
  },
};

export type UpdateLandingRequest = {
  params: {
    landingId: Id,
  },
  landing: LandingDraft,
};

export type DeleteLandingRequest = {
  params: {
    landingId: Id,
  },
};

export type GetLandingsResponse = {
  landings: {
    ...AffiliateLanding,
    usages: number,
  }[],
};

export type CreateLandingResponse = {
  landing: AffiliateLanding,
};

export type UpdateLandingResponse = {
  landing: AffiliateLanding,
};

export type GetAffiliateLandingsRequest = {
  session: {
    affiliateId: Id,
  },
  params: {
    brandId?: BrandId,
  },
};

export type GetAffiliateLandingsResponse = {
  landings: {
    brandId: BrandId,
    landingPage: string,
  }[],
};
