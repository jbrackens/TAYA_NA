/* @flow */

export type ContentStatus = 'published' | 'draft';
export type ContentDraft = {
  contentTypeId: Id,
  name: string,
  content: any,
  externalId: string,
  subtype: string,
  status: ContentStatus,
  active?: boolean,
  updatedAt?: Date,
};

export type Content = { id: Id, ...ContentDraft };

export type EventDraft = {
  campaignContentId: Id,
  text: string,
  timestamp: Date,
};

export type Event = { id: Id, ...EventDraft };
