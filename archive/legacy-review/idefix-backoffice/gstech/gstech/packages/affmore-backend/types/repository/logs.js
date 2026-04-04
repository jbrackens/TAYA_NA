/* @flow */

export type LogDraft = {
  note: string,
  attachments?: string[],
};

export type Log = {
  id: Id,
  affiliateId: Id,

  ...LogDraft,

  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};
