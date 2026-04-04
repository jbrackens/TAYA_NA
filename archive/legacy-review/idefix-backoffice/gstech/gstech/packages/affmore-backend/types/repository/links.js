// @flow
import type { ActivityData } from '../common';

export type LinkDraft = {
  planId: ?Id,
  brandId: BrandId, // TODO: this is nullable in db, probably it shouldn't
  name: string,
  landingPage: string,
};

export type Link = {
  id: Id,
  affiliateId: Id,
  code: string,

  ...LinkDraft,
};

export type LinkWithDetails = {
  ...Link,
  deal: ?string,
};

export type ClickDraft = {
  linkId: Id,
  clickDate: Date,

  referralId?: string,
  segment?: string,
  queryParameters?: Object,
  ipAddress: IPAddress,
  userAgent: ?string,
  referer: ?string,
};

export type Click = {
  id: Id,
  ...ClickDraft,
};

export type ClickWithStatistics = {
  clickDate: string, // day
  segment: string,
  clicks: number,
  nrc: number,
  ndc: number,
  ...ActivityData,
  cpaCount: number,
};
