// @flow
import type { Axios } from 'axios';

const _ = require('lodash');
const axios = require('axios');
const { default: axiosRetry } = require('axios-retry');
const logger = require('./logger');

export type AxError = {
  code: string,
  name: string,
  message: string,
  error: Object,
  cause: Object,
  statusCode: number,
};

const errorTransformer = (error: any) => {
  const { code, name, response, status, cause } = error;
  const statusCode = status || response?.status;
  let message = `${statusCode}`;
  if (response && response.data)
    if (response.headers['content-type'].includes('application/json'))
      message += ` ${JSON.stringify(response.data)}`;
    else message += ` ${_.truncate(response.data, { length: 100 })}`;
  return Promise.reject(
    ({
      code,
      name,
      message,
      error: response && response.data,
      cause,
      statusCode,
    }: AxError),
  );
};

const axiosRetryStrategy = (err: any) => {
  // keep same behaviour as requestretry
  const RETRIABLE_ERRORS = [
    'ECONNRESET',
    'ENOTFOUND',
    'ESOCKETTIMEDOUT',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'EPIPE',
    'EAI_AGAIN',
    'EBUSY',
  ];

  if (err && err.code === 'ENOTFOUND') {
    logger.error('ENOTFOUND error from API. Exiting.', err);
    if (process.env.CI_DEP === 'false') process.exit();
  }
  return (
    (err.code && _.includes(RETRIABLE_ERRORS, err.code)) ||
    (err.response &&
      (err.response.status === 429 || (err.response.status > 500 && err.response.status < 600)))
  );
};

const ax: Axios = axios.create();
const axRetry: Axios = axios.create<any, any>();
axiosRetry(axRetry, { retries: 5, retryDelay: () => 5000, retryCondition: axiosRetryStrategy });

[ax, axRetry].forEach((a) =>
  a.interceptors.response.use(
    (response) => response,
    (error) => errorTransformer(error),
  ),
);

module.exports = {
  axios: ax,
  axiosRetry: axRetry,
};
