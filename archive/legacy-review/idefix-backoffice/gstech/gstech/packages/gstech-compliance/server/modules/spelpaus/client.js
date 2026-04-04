/* @flow */
import type { BlockingInfoRequest, BlockingInfoResponse, MarketingSubjectIdRequest, MarketingResponse, SubjectBlockedResult } from './types';

const { axios } = require('gstech-core/modules/axios');
const { v1: uuid } = require('uuid');

const config = require('../../config');

const getRequestId = () => (config.isTest ? 'nock_id' : uuid());

const postBlockingInfo = async (subjectId: string): Promise<SubjectBlockedResult> => {
  const body: BlockingInfoRequest = { requestId: getRequestId(), subjectId };

  const { data: response } = await axios.post<BlockingInfoRequest, BlockingInfoResponse>(
    `${config.providers.spelpaus.url}/blocking-info/${config.providers.spelpaus.actorId}`,
    body,
    { headers: { authorization: config.providers.spelpaus.apiKey } },
  );

  const result = { subjectId, isBlocked: response.isBlocked };
  return result;
};

const postMarketingSingleSubjectId = async (subjectId: string): Promise<SubjectBlockedResult> => {
  const body: BlockingInfoRequest = { requestId: getRequestId(), subjectId };

  const { data: response } = await axios.post<BlockingInfoRequest, BlockingInfoResponse>(
    `${config.providers.spelpaus.url}/marketing-single-subjectid/${config.providers.spelpaus.actorId}`,
    body,
    { headers: { authorization: config.providers.spelpaus.apiKey } },
  );

  const result = { subjectId, isBlocked: response.isBlocked };
  return result;
};

const postMarketingSubjectId = async (subjectIds: string[]): Promise<SubjectBlockedResult[]> => {
  const body: MarketingSubjectIdRequest = {
    requestId: getRequestId(),
    items: subjectIds.map(s => ({ itemId: s, subjectId: s })),
  };

  const { data: response } = await axios.post<MarketingSubjectIdRequest, MarketingResponse>(
    `${config.providers.spelpaus.url}/marketing-subjectid/${config.providers.spelpaus.actorId}`,
    body,
    { headers: { authorization: config.providers.spelpaus.apiKey } },
  );

  const result = subjectIds.map(i => ({ subjectId: i, isBlocked: !response.allowedItemIds.includes(i) }));
  return result;
};

module.exports = {
  postBlockingInfo,
  postMarketingSingleSubjectId,
  postMarketingSubjectId,
};
