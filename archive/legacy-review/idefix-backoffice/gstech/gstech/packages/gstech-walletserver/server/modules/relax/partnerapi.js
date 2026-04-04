/* @flow */
import type { RelaxAddFreeRoundsRequest, RelaxAddFreeRoundsResponse } from './types';

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const {
  api: {
    partnerApi,
    partnerApiAuth: { user: username, pass: password },
  },
} = config.providers.relax;

const partnerApiRequest = async ({
  path,
  body,
  method = 'POST',
  qs = {},
}: {
  path: string,
  body?: any,
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE',
  qs?: { [string]: any },
}): Promise<any> => {
  logger.debug(`>>> RLX PartnerAPI ${method} ${path}`, { body });
  const { data: response } = await axios.request({
    method,
    url: `${partnerApi}/${path}`,
    params: qs,
    auth: { username, password },
    data: body,
  });
  logger.debug(`<<< RLX PartnerAPI ${method} ${path}`, { response });
  return response;
};

const addFreeRounds = async (
  requestData: RelaxAddFreeRoundsRequest,
): Promise<RelaxAddFreeRoundsResponse> =>
  partnerApiRequest({ path: '/casino/freespins/add', body: requestData });

module.exports = {
  addFreeRounds,
};
