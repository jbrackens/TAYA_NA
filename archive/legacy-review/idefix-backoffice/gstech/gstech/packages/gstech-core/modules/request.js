/* @flow */
const _ = require('lodash');
const { toFormData } = require('axios');
const { axiosRetry } = require('./axios');
const logger = require('./logger');

const pathJoin = (...args: Array<string>) =>
  args
    .map((part, i) => {
      if (i === 0) {
        return part.trim().replace(/[/]*$/g, '');
      }
      return part.trim().replace(/(^[/]*|[/]*$)/g, '');
    })
    .filter((x) => x.length)
    .join('/');

const statusCheck = async (name: string, url: string) => {
  try {
    const { data: body } = await axiosRetry.request({
      url: pathJoin(url.includes('api') ? url : pathJoin(url, 'api/v1'), 'status'),
      'axios-retry': { retries: 10 },
    });

    if (!body.ok) {
      logger.error(`Api "${name}", ${url} not reachable`, body.error || body);
    }
  } catch (e) {
    logger.error(`Api "${name}", ${url} not reachable`, e);
  }
};

const doReq = (
  name: string,
  url: string,
): (<T>(
  method: HttpMethod,
  path: string,
  body: any,
  headers: any,
  auth?: { pass: string, user: string, ... },
  queryParams?: { [key: string]: mixed },
  formData?: any,
) => Promise<T>) => {
  statusCheck(name, url);

  return async function generic<T>(
    method: HttpMethod,
    path: string,
    body: Object,
    headers: Object,
    auth?: { user: string, pass: string, ... },
    queryParams?: { [key: string]: mixed },
    formData?: Object,
  ): Promise<T> {
    const options = {
      url: pathJoin(url, path),
      method,
      data: body,
      params: method === 'GET' && body ? body : queryParams,
      headers,
      formData: formData && toFormData(formData),
    };
    try {
      const response = await axiosRetry.request({
        ...options,
        ...(auth && {
          auth: {
            username: auth && auth.user,
            password: auth && auth.pass,
          },
        }),
        'axios-retry': { retries: 5 },
      });

      if (response.data.error) throw response.data.error;
      if (response.status < 200 || response.status > 300) throw response;

      return response.data.data || response.data;
    } catch (err) {
      const { cause, code, error, stack } = err;
      logger.error('XXX gstech-core/request error', { url, path, cause, code, stack });
      if (!_.isEmpty(error)) {
        logger.error('XXXXX gstech-core/request error NON-EMPTY', { error });
        throw error;
      } else {
        logger.error('XXXXX gstech-core/request error EMPTY', { err });
        throw err;
      }
    }
  };
};

module.exports = doReq;
