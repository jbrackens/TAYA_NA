/* @flow */
import type { BriteCredentials, merchantReferenceParserFn } from './types';

const {
  map,
  isArray,
  isPlainObject,
  mapKeys,
  mapValues,
  camelCase,
  snakeCase,
  invert,
  pickBy,
} = require('lodash');
const { axios } = require('gstech-core/modules/axios');
const { parseBrandId, getDepositAlt } = require('gstech-core/modules/clients/backend-payment-api');
const { brands } = require('gstech-core/modules/constants');
const logger = require('gstech-core/modules/logger');
const { sleep } = require('gstech-core/modules/utils');
const config = require('../../../config');
const { SESSION, TRANSACTION } = require('./constants');

const briteConfig = config.providers.brite;

const stringifyState = (state: number, ref: 'S' | 'T'): string =>
  `>>> ${ref === 'S' ? 'SESSION' : 'TRANSACTION'} ${
    invert(pickBy(ref === 'S' ? SESSION : TRANSACTION, (v, k) => k.startsWith('STATE')))[state]
  } (${state}) <<<`;

const stringifySessionState = (state: number): string => stringifyState(state, 'S');
const stringifyTransactionState = (state: number): string => stringifyState(state, 'T');

const mapKeysDeep = (obj: any, fn: () => any): any => {
  if (isArray(obj)) return map(obj, (innerObj) => mapKeysDeep(innerObj, fn));
  if (isPlainObject(obj)) return mapValues(mapKeys(obj, fn), (value) => mapKeysDeep(value, fn));
  return obj;
};
const camelCaseify = (i: {}): any => mapKeysDeep(i, (v, k) => camelCase(k));
const snakeCaseify = (i: {}): any => mapKeysDeep(i, (v, k) => snakeCase(k));

const camelCaseifyMiddleware = (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
) => {
  req.body = camelCaseify(req.body);
  next();
};
const logStateMiddleware = (
  { body, path }: express$Request,
  res: express$Response,
  next: express$NextFunction,
) => {
  const { transactionState, sessionState } = body;
  if (sessionState) logger.info(path, stringifyState(sessionState, 'S'), body);
  if (transactionState) logger.info(path, stringifyState(transactionState, 'T'), body);
  next();
};

const pollWithBackoff = async <T>(fn: Promise<T>, cond: (T) => boolean): Promise<T> => {
  let result = await fn;
  // eslint-disable-next-line no-plusplus
  for (let d = 1; d <= 3; d++) {
    if (cond(result)) return result;
    await sleep(d * 3000);
    result = await fn;
  }
  return result;
};

const cbUrl = (publicUrl: string = config.server.public) =>
  config.isTest ? publicUrl.replace('http', 'https') : publicUrl;
const makeSessionCb = (state: number, path: string = ''): any => ({
  url: `${cbUrl(config.server.public)}/api/v1/brite${path}`,
  sessionState: state,
});
const makeTransactionCb = (state: number, path: string = ''): any => ({
  url: `${cbUrl(config.server.public)}/api/v1/brite${path}`,
  transactionState: state,
});

const parseMerchantReference: merchantReferenceParserFn = async (
  merchantReference: string,
  // $FlowFixMe[incompatible-type]
  { pnpRegistration }: { pnpRegistration: boolean } = { pnpRegistration: false },
) => {
  const [brandOrUsername, transactionKey] = merchantReference.split('|');
  const isPnp = brands.some((k) => k.id === brandOrUsername);
  const brandId = isPnp ? brandOrUsername : parseBrandId(brandOrUsername);
  let username = isPnp ? null : brandOrUsername;
  if (!pnpRegistration)
    try {
      username = (await getDepositAlt(transactionKey)).deposit.username;
    } catch (e) {
      logger.warn(`parseMerchantReference: no deposit for ${transactionKey}`, e);
    }
  // $FlowIgnore
  return { transactionKey, brandId, username, isPnp };
};

const briteRequest = async (
  path: string,
  brandId: BrandId,
  body: any,
  auth: ?BriteCredentials,
): Promise<any> => {
  const { apiUrl } = briteConfig[brandId];
  const snakdBody = snakeCaseify(body);
  if (path !== 'merchant.authorize') logger.debug(`>>>>> Brite/${path}`, snakdBody);
  const { data: response } = await axios.request({
    method: 'POST',
    url: `${apiUrl}/${path}`,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
    },
    data: snakdBody,
  });
  const camldResponse = camelCaseify(response);
  if (path !== 'merchant.authorize') logger.debug(`<<<<< Brite/${path}`, camldResponse);
  return camldResponse;
};
const authenticateMerchant = async (brandId: BrandId): Promise<BriteCredentials> => {
  const { publicKey, secret } = briteConfig[brandId];
  return await briteRequest('merchant.authorize', brandId, { publicKey, secret });
};

// TODO Brite: see if possible to store creds externally and only refresh when expired
const authedBriteRequest = async (
  path: string,
  brandId: BrandId,
  body: any,
  auth: ?BriteCredentials,
): Promise<any> =>
  await briteRequest(path, brandId, body, auth || (await authenticateMerchant(brandId)));

module.exports = {
  pollWithBackoff,
  stringifyState,
  stringifySessionState,
  stringifyTransactionState,
  parseMerchantReference,
  briteRequest,
  authenticateMerchant,
  authedBriteRequest,
  makeSessionCb,
  makeTransactionCb,
  camelCaseify,
  snakeCaseify,
  camelCaseifyMiddleware,
  logStateMiddleware,
};
