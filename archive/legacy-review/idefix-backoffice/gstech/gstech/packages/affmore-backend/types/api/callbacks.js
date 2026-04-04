// @flow
import type { CallbackMethod, CallbackTrigger, CallbackDraft } from '../repository/callbacks';
import type { UserWithRoles } from '../repository/auth';

export type AffiliateCallback = {
  callbackId: Id,
  linkId: ?Id,
  code?: string,
  name?: string,
  brandId: BrandId,
  method: CallbackMethod,
  trigger: CallbackTrigger,
  url: string,
  enabled: boolean,
  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};

export type CreateCallbackRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
  callback: CallbackDraft,
};

export type GetCallbackRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
};

export type UpdateCallbackRequest = {
  params: {
    affiliateId: Id,
    callbackId: Id,
  },
  callback: CallbackDraft,
};

export type DeleteCallbackRequest = {
  params: {
    affiliateId: Id,
    callbackId: Id,
  },
};

export type CreateCallbackResponse = {
  callback: AffiliateCallback,
};

export type GetCallbacksResponse = {
  callbacks: AffiliateCallback[],
};

export type UpdateCallbackResponse = {
  callback: AffiliateCallback,
};
