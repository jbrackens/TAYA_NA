// @flow
import type { ActivityData } from '../common';
import type { PlayedUpdateDraft } from '../repository/players';
import type { UserWithRoles } from '../repository/auth';

export type GetAffiliatePlayersRevenuesAdminRequest = {
  params: {
    affiliateId: Id,
    year?: number,
    month?: number,
  },
  query: {
    brandId?: BrandId,
  },
};

export type GetAffiliatePlayerActivitiesAdminRequest = {
  params: {
    affiliateId: Id,
    playerId: Id,
    year?: number,
    month?: number,
  },
};

export type UpdateAffiliatePlayerRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    playerId: Id,
  },
  player: Partial<PlayedUpdateDraft>,
};

export type GetAffiliatePlayersRevenuesResponse = {
  revenues: {
    items: {
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
    }[],
    totals: {
      ...ActivityData,
    },
    total: Money,
  },
};

export type GetAffiliatePlayerActivitiesResponse = {
  activities: {
    items: {
      activityId: Id,
      activityDate: string,
      ...ActivityData,
    }[],
    totals: {
      ...ActivityData,
    },
    total: Money,
  }
};

export type UpdateAffiliatePlayerResponse = OkResult;
