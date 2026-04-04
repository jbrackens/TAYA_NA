/* @flow */
import type { Limit, LimitType, LimitPeriodType } from '../types/limits';

const config = require('../config');
const request = require('../request')('backend limits api', config.api.backend.url);

export type SetLimitRequest = {
  type: LimitType,
  permanent: boolean,
  days: number,
  reason: string,
  periodType: LimitPeriodType,
  limitValue: number,
  isInternal?: boolean,
};

export type RemoveLimitRequest = {
  reason: string,
};

export type RemoveLimitResponse = {
  ['expires' | 'cancelled']: Date,
  playerId: Id,
  exclusionKey: string,
};

const doReq = (brandId: BrandId, username: string, method: HttpMethod, path: string, body: mixed): Promise<any> => {
  const token = config.api.backend.staticTokens[brandId];
  return request(method, `/api/${brandId}/v1/${path}`, body, { Authorization: `Bearer ${username}`, 'X-Token': token });
};

const getLimits = async (brandId: BrandId, username: string): Promise<{ result: Array<Limit> }> =>
  doReq(brandId, username, 'GET', 'exclusions', {});

const setLimit = async (brandId: BrandId, username: string, data: SetLimitRequest): Promise<{ result: Array<Limit> }> =>
  doReq(brandId, username, 'POST', 'exclusions', data);

const removeLimit = async (brandId: BrandId, username: string, exclusionKey: string, data: RemoveLimitRequest): Promise<{ exclusion: RemoveLimitResponse }> =>
  doReq(brandId, username, 'DELETE', `exclusions/${exclusionKey}`, data);

module.exports = {
  getLimits,
  setLimit,
  removeLimit,
};
