/* @flow */
const request = require('requestretry');
const logger = require('./logger');
const errors = require('./errors/error-codes');

const retryStrategy = (err: Error, response: http$IncomingMessage<>, body: any) => {
  const statusCode = response ? response.statusCode : null;
  return request.RetryStrategies.NetworkError(err, response, body) || (statusCode && (statusCode === 429 || (statusCode > 500 && statusCode < 600)));
};

const pathJoin = (...args) => args.map((part, i) => {
  if (i === 0) {
    return part.trim().replace(/[/]*$/g, '');
  }
  return part.trim().replace(/(^[/]*|[/]*$)/g, '');
}).filter(x => x.length).join('/');

const doReq = (name: string, url: string) => async (method: HttpMethod, path: string, body: any, headers: any, auth?: { user: string, pass: string}): Promise<any> => {
  try {
    const options = {
      uri: pathJoin(url, path),
      method,
      json: true,
      body,
      headers,
      auth,
      retryStrategy,
    };
    const response = await request(options);
    logger.debug(`${name} response`, path, response.statusCode, response.body);

    if (response.body.error) throw response;

    return response.body;
  } catch (e) {
    if (e.statusCode === 404) {
      return Promise.reject(e.body || 'Not found');
    }
    if (e.statusCode === 403) {
      return Promise.reject(errors.SESSION_EXPIRED);
    }
    if (e.statusCode === 400) {
      return Promise.reject(e.body);
    }
    if (e.statusCode > 299) {
      const { error } = e.body;
      if (error != null) {
        return Promise.reject({ ErrorNo: error.code || 'error.500', Description: error.message, exclusion: error.exclusion, error });
      }
    }
    if (e.error && e.error.code) {
      return Promise.reject(e);
    }
    if (e.cause && e.cause.code === 'ECONNREFUSED') {
      return Promise.reject('ECONNREFUSED');
    }
    return Promise.reject(e);
  }
};

module.exports = doReq;
