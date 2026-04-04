/* @flow */
 
import type {
  MicrogamingRequest,
  MicrogamingAuthentication,
  LoginRequest,
  GetBalanceRequest,
  PlayRequest,
  AwardBonusRequest,
  EndGameRequest,
  RefreshTokenRequest,
  MicrogamingConfiguration,
} from './types';

const moment = require('moment-timezone');
const { xmlEncode } = require('gstech-core/modules/soap');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const MicrogamingOperations = require('./MicrogamingOperations');

const configuration = config.providers.microgaming;

const errors = {
  '6000': 'Unspecified Error',
  '6001': 'The player token is invalid',
  '6002': 'The player token expired',
  '6003': 'The authentication credentials for the API are incorrect',
  '6101': 'Login validation failed. Login name or password is incorrect.',
  '6102': 'Account is locked.',
  '6103': 'Account does not exist.',
  '6104': 'Player is self-excluded.',
  '6105': 'Player must accept the T&Cs.',
  '6106': 'Must Show Player Protection.',
  '6107': 'The IP address is restricted.',
  '6108': 'The password expired.',
  '6109': 'Self-exclusion is over and the player must contact the operator to lift the exclusion. The cooling period is effective once this is done.',
  '6110': 'Self-exclusion is over but the player is in the cooling period.',
  '6111': 'Account is blacklisted.',
  '6112': 'Player is deactivated.',
  '6501': 'Already processed with different details.',
  '6503': 'Player has insufficient funds.',
  '6505': 'The player exceeded their daily protection limit.',
  '6506': 'The player exceeded their weekly protection limit',
  '6507': 'The player exceeded their monthly protection limit.',
  '6508': 'The player exceeded their game play duration.',
  '6509': 'The player exceeded their loss limit',
  '6510': 'The player is not permitted to play this game',
  '6511': 'The external system name does not exist',
};

export type ErrorCode = $Keys<typeof errors>;

const returnResponse = (request: MicrogamingRequest, body: string) => {
  const resp = `<pkt>
    <methodresponse name="${request.name}" timestamp="${moment().format('YYYY/MM/DD HH:mm:ss.SSS')}" >
      ${body}
    </methodresponse>
  </pkt>`;
  logger.debug('Microgaming response', resp);
  return resp;
};

const returnError = (request: MicrogamingRequest, errorCode: ErrorCode) =>
  returnResponse(request, `<result seq="${xmlEncode(request.seq)}" errorcode="${errorCode}" errordescription="${xmlEncode(errors[errorCode])}">
      <extinfo/>
    </result>
  `);

const login = async (request: MicrogamingRequest, body: LoginRequest) => {
  const { balance, bonusbalance, token, loginname, currency, country, city, wallet } = await MicrogamingOperations.login(body);
  return returnResponse(request, `<result seq="${xmlEncode(request.seq)}"
    token="${xmlEncode(token)}"
    loginname="${xmlEncode(loginname)}"
    currency="${xmlEncode(currency)}"
    country="${xmlEncode(country)}"
    city="${xmlEncode(city)}"
    balance="${balance}"
    bonusbalance="${bonusbalance}"
    wallet="${wallet}"><extinfo/></result>`);
};

const getBalance = async (request: MicrogamingRequest, body: GetBalanceRequest) => {
  const { balance, bonusbalance, token } = await MicrogamingOperations.getBalance(body);
  return returnResponse(request, `<result seq="${xmlEncode(request.seq)}" token="${xmlEncode(token)}" balance="${balance}" bonusbalance="${bonusbalance}"><extinfo /></result>`);
};

const play = async (request: MicrogamingRequest, body: PlayRequest) => {
  const { balance, bonusbalance, token, exttransactionid } = await MicrogamingOperations.play(body);
  return returnResponse(request, `<result seq="${xmlEncode(request.seq)}"
    token="${xmlEncode(token)}"
    balance="${balance}"
    bonusbalance="${bonusbalance}"
    exttransactionid="${exttransactionid}">
      <extinfo />
    </result>`);
};

const awardBonus = async (request: MicrogamingRequest, body: AwardBonusRequest) => {
  const { balance, exttransactionid, bonusbalance } = await MicrogamingOperations.awardBonus(body);
  return returnResponse(request, `<result seq="${xmlEncode(request.seq)}" balance="${balance}" bonusbalance="${bonusbalance}" exttransactionid="${xmlEncode(`${exttransactionid}`)}"><extinfo/></result>`);
};

const endGame = async (request: MicrogamingRequest, body: EndGameRequest) => {
  const { balance, token, bonusbalance } = await MicrogamingOperations.endGame(body);
  return returnResponse(request, `<result seq="${xmlEncode(request.seq)}" token="${xmlEncode(token)}" balance="${balance}" bonusbalance="${bonusbalance}"><extinfo /></result>`);
};

const refreshToken = async (request: MicrogamingRequest, body: RefreshTokenRequest) => {
  const { token } = await MicrogamingOperations.refreshToken(body);
  return returnResponse(request, `<result seq="${xmlEncode(request.seq)}" token="${xmlEncode(token)}"><extinfo /></result>`);
};

const endpoint = {
  login,
  play,
  getbalance: getBalance,
  awardbonus: awardBonus,
  endgame: endGame,
  refreshtoken: refreshToken,
};

const validateRequest = (params: MicrogamingAuthentication): ?MicrogamingConfiguration => {
  for (const conf of configuration) {
    for (const [, brand] of Object.entries(conf.brands)) {
      const b: { login: string, password: string } = (brand: any);
      if (params.login === b.login || params.password === b.password) {
        return conf;
      }
    }
  }
  logger.warn('Microgaming authentication failed', params);
  return null;
};

export type QueryResponse = {
  request: MicrogamingRequest,
  authentication: MicrogamingAuthentication,
  operation: any,
};

const parseQuery = (body: any): QueryResponse => {
  const { pkt } = body;
  const call = pkt.methodcall[0];
  const authentication = call.auth[0].$;
  const op = call.call[0].$;
  const { seq, token } = op;
  const ts = moment(call.$.timestamp, 'YYYY/MM/DD HH:mm:ss.SSS').toDate();
  const request = { ...call.$, seq, token };
  const operation = { ...op, ts };
  return { request, authentication, operation };
};

const WalletServer = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  const query: any = req.body;
  const { request, authentication, operation } = parseQuery(query);
  const cb = endpoint[request.name];
  if (cb) {
    res.type('text/xml; charset=utf-8');

    const conf = validateRequest(authentication);
    if (conf == null) {
      return res.status(200).send(returnError(request, '6003'));
    }
    try {
      operation.manufacturerId = conf.manufacturerId;
      const response = await cb(request, operation);
      logger.debug('WalletServer Microgaming', operation, response);
      return res.send(response);
    } catch (e) {
      if (e.code != null) {
        logger.debug('Microgaming WalletServer failed', e);
        return res.status(200).send(returnError(request, e.code));
      }
      logger.warn('Microgaming WalletServer failed', e);
      return res.status(200).send(returnError(request, '6000'));
    }
  }
  return res.status(404).end('Invalid operation');
};

const redirectHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Microgaming Redirect request', req.query);
    return res.redirect(301, req.query.finalUrl);
  } catch (e) {
    logger.error('Microgaming Redirect failed', { query: req.query, error: e });
    return res.status(400).end('Invalid redirect');
  }
};

module.exports = { WalletServer, redirectHandler };
