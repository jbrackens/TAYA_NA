/* @flow */
export type BlockingInfoRequest = {
  requestId: string,
  subjectId: string,
};

export type BlockingInfoResponse = {
  isBlocked: boolean,
  requestId: string,
  responseId: string,
};

export type MarketingSubjectIdRequestItem = {
  itemId: string,
  subjectId: string,
};

export type MarketingSubjectIdRequest = {
  requestId: string,
  items: MarketingSubjectIdRequestItem[],
};

export type MarketingResponse = {
  requestId: string,
  allowedItemIds: string[],
  responseId: string,
};

export type SubjectBlockedResult = {
  subjectId: string,
  isBlocked: boolean,
};
