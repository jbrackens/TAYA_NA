/* @flow */

import type {
  IdentifyRequest,
  IdentifyResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';

const { axios } = require('gstech-core/modules/axios');

const { sessionSignature } = require('./signature');
const config = require('../../../config');
const { getVeriffHeaders } = require('./utils');

const veriffConfig = config.providers.veriff;

const identify = async (identifyRequest: IdentifyRequest): Promise<IdentifyResponse> => {
  const payload = {
    verification: {
      callback: identifyRequest.urls.ok,
      person: {
        firstName: identifyRequest.player.firstName,
        lastName: identifyRequest.player.lastName,
      },
      vendorData: identifyRequest.player.username,
      lang: identifyRequest.player.languageId,
      timestamp: new Date(),
    },
  };

  const headers = getVeriffHeaders(sessionSignature(payload));

  const { data: resp } = await axios.request({
    method: 'POST',
    url: `${veriffConfig.apiUrl}/sessions`,
    headers,
    data: payload,
  });
  if (resp.status && resp.status === 'success') {
    return {
      requiresFullscreen: true,
      url: resp.verification.url,
    };
  }

  return {
    requiresFullscreen: false,
    url: identifyRequest.urls.failure,
  };
};

const api = { identify };
module.exports = api;
