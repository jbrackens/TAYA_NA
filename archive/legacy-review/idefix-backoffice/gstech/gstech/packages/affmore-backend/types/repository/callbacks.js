/* @flow */
export type CallbackMethod = 'GET' | 'POST';
export type CallbackTrigger = 'NRC' | 'NDC';
export type CallbackStatus = 'SUCCESS' | 'FAILED';

export type CallbackUniqueKey = {
  affiliateId: Id,
  linkId?: ?Id,
  brandId: BrandId,
  trigger: CallbackTrigger,
  method?: CallbackMethod,
};

export type CallbackDraft = {
  linkId?: ?Id,
  brandId: BrandId,
  method: CallbackMethod,
  trigger: CallbackTrigger,
  url: string,
  enabled: boolean,
};

export type Callback = {
  id: Id,

  ...CallbackDraft,

  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};

export type CallbackLogDraft = {
  callbackId: Id,
  playerId: Id,
  status: CallbackStatus,
  callbackUrl: string,
  callbackResponse: string,
};

export type CallbackLog = {
  id: Id,
  callbackDate: Date,

  ...CallbackLogDraft,
};
