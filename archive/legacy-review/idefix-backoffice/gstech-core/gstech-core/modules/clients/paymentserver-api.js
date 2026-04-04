/* @flow */

const request = require('request-promise');
const config = require('../config');
const logger = require('../logger');

const doReq = async (method: HttpMethod, path: string, body: mixed, headers: mixed): Promise<any> => {
  try {
    logger.debug('paymentserver-api request', method, path, body, headers);
    const options = {
      uri: `${config.api.paymentServer.private}${path}`,
      method,
      json: true,
      body,
      headers,
    };
    const response = await request(options);

    logger.debug('paymentserver-api response', method, path, response);
    return response;
  } catch (e) {
    if (e.statusCode === 404) {
      return Promise.reject(e.error || 'Not found');
    }
    if (e.statusCode === 400) {
      return Promise.reject(e.error);
    }
    if (e.error && e.error.code) {
      return Promise.reject(e.error);
    }
    if (e.cause && e.cause.code === 'ECONNREFUSED') {
      return Promise.reject('ECONNREFUSED');
    }
    return Promise.reject(e);
  }
};

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> =>
  doReq('POST', '/deposit', depositRequest);

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> =>
  doReq('POST', '/withdraw', withdrawRequest);

const identify = async (identifyRequest: IdentifyRequest): Promise<IdentifyResponse> =>
  doReq('POST', '/identify', identifyRequest);

const register = async (registerRequest: RegisterRequest): Promise<RegisterResponse> =>
  doReq('POST', '/register', registerRequest);

module.exports = {
  deposit,
  withdraw,
  identify,
  register,
};
