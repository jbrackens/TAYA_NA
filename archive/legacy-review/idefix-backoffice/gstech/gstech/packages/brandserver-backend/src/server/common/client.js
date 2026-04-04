/* @flow */
import type { AxError } from 'gstech-core/modules/axios';

const http = require('http');
const https = require('https');
const _ = require('lodash');
const { isNetworkError } = require('axios-retry');
const { axiosRetry } = require('gstech-core/modules/axios');
const errors = require('gstech-core/modules/errors/error-codes');
const logger = require('./logger');
const configuration = require('./configuration');

if (configuration.apiKey() == null) {
  logger.warn(`!!! ${configuration.project()} API Key is not set`);
}

const execute = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body: any = {},
  headers: any = {},
): Promise<any> => {
  if (!_.includes(['GET', 'POST', 'PUT', 'DELETE'], method)) {
    return Promise.reject(`Invalid method! ${path} ${method}`);
  }
  const { sessionKey } = body;
  if (sessionKey != null) {
    headers.Authorization = `Token ${sessionKey}`;
  }
  headers['X-Token'] = configuration.apiKey();

  const query: any = {
    uri: `${configuration.apiUrl()}${path}`,
    method,
    json: true,
    headers,
    agentOptions: { keepAlive: true, keepAliveMsecs: 15000, maxFreeSockets: 1 },
    gzip: true,
    retryDelay: 2000,
  };
  query[method === 'GET' ? 'qs' : 'body'] = _.omit(body, ['sessionKey']);
  return new Promise((resolve, reject) => {
    axiosRetry
      .request({
        url: query.uri,
        method: query.method,
        headers: query.headers,
        httpAgent: new http.Agent(query.agentOptions),
        httpsAgent: new https.Agent(query.agentOptions),
        decompress: query.gzip,
        params: query.qs || {},
        data: query.body || {},
        'axios-retry': {
          retries: 5,
          retryDelay: () => query.retryDelay,
          retryCondition: isNetworkError,
        },
      })
      .then(({ data }) => resolve(data))
      .catch((err: AxError) => {
        const proj = configuration.project();
        const { uri, method } = query;
        const { statusCode: status, error: body, cause } = err;
        if (!_.isEmpty(cause)) {
          if (cause.code === 'ENOTFOUND') {
            logger.error(`XXX ${proj} API:ENOTFOUND. Exiting.`, { err, method, uri });
            process.exit();
          }
          logger.error(`XXX ${proj} API:UNEXPECTED`, { err, method, uri });
          return reject(err);
        }
        if (status === 403) return reject(errors.SESSION_EXPIRED);
        if (status > 299) {
          logger.warn(`!!! ${proj} BACKEND:ERR`, { status, method, uri, body });
          if (!_.isEmpty(body)) {
            const { error, exclusion } = body;
            if (!_.isEmpty(error) && error.code && error.message && exclusion)
              return reject({
                ErrorNo: error.code || 'error.500',
                Description: error.message,
                exclusion,
              });
            logger.error(`XXX ${proj} BACKEND:UNEXPECTED`, { body, method, uri });
            return reject({
              ErrorNo: body.code || 'error.500',
              Description: body.message,
              exclusion,
            });
          }
        }
      });
  });
};

module.exports = {
  execute,
};
