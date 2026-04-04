/* @flow */
import type { ActivityData } from '../common';

export type ActivityDraft = {
  playerId: Id,
  activityDate: string, // day
  ...ActivityData,
};

export type Activity = {
  id: Id,
  brandId: BrandId,
} & ActivityDraft;

export type ActivityReport = {
  link: string,
  linkId: Id,
  segment: ?string,
  brandId: BrandId,
  clicks: number,
  nrc: number,
  ndc: number,
  ...ActivityData,
};
