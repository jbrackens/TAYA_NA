/* @flow */
import type { PlayerIdentifier } from 'gstech-core/modules/types/player';
import type {
  CompleteLoginRequest,
  RequestLoginRequest,
  RequestLoginResponse,
} from 'gstech-core/modules/clients/backend-api-types';

import type { Country } from '../countries/Country';

const errorCodes = require('gstech-core/modules/errors/error-codes');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { getSession, getPlayerSession } = require('./store');
const PlayerPin = require('../players/PlayerPin');
const Player = require('../players/Player');
const Session = require('./Session');
const { findCountry } = require('../countries');
const { lookup } = require('../core/geoip');
const { getPlayerWithDetails, findByUsername, findPlayer, getByIds, getSowClearanceState } = require('../players/Player');
const { authenticate, authenticateByMobilePhone } = require('../players/Authenticate');
const { checkLogin } = require('../limits');
const { addEvent } = require('../players/PlayerEvent');
const { isWhitelistedIp } = require('../settings');
const { loginSchema, mobileLoginSchema, requestLoginSchema, completeLoginSchema } = require('./schemas');
const Notification = require('../core/notifications');

const validateLogin = (ipAddress: IPAddress, country: ?Country) => {
  if (!isWhitelistedIp(ipAddress) && country && !country.loginAllowed) {
    return { error: errorCodes.LOGIN_BLOCKED_FROM_COUNTRY };
  }
  return {};
};

const processLogin = async (
  req: express$Request,
  res: express$Response,
  loginData: { ipAddress: IPAddress, userAgent: string },
  player: { ...PlayerIdentifier, ... },
): Promise<express$Response> => {
  logger.debug('>>>> processLogin', { loginData, player });
  const country = await lookup(loginData.ipAddress).then((id) =>
    id != null ? findCountry(req.params.brandId, id) : null,
  );

  const { error: validationError } = validateLogin(loginData.ipAddress, country);
  if (validationError) {
    await addEvent(player.id, undefined, 'activity', 'loginCountryBlocked', { country });
    return res.status(400).json({ error: validationError });
  }

  const sowState = await getSowClearanceState(player.id);
  if (sowState === 'FAIL') {
    await addEvent(player.id, undefined, 'activity', 'sow.blockedLogin', {});
    return res.status(400).json({ error: errorCodes.SOW_REJECTED });
  }

  const { exclusion, error: exclusionError } = await checkLogin(player.id);
  if (exclusionError) {
    await addEvent(player.id, undefined, 'activity', 'loginExclusionBlocked', {});
    return res.status(400).json({ exclusion, error: exclusionError });
  }
  const playerWithDetails = await getPlayerWithDetails(player.id);

  const playerCountry = await findCountry(req.params.brandId, playerWithDetails.countryId);

  const { error: validationError2 } = validateLogin(loginData.ipAddress, playerCountry);
  if (validationError2) {
    await addEvent(player.id, undefined, 'activity', 'loginCountryBlocked', { country });
    return res.status(400).json({ error: validationError2 });
  }

  const { token } = await Session.createSession(player, loginData.ipAddress, loginData.userAgent);

  Notification.updatePlayer(player.id, 'Login');
  const resp = { player: playerWithDetails, token };
  logger.debug('<<<< processLogin', { resp });
  return res.status(200).json(resp);
};

const mobileLoginHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { error, value: loginData } = mobileLoginSchema.validate(req.body);
    if (error) {
      logger.warn('mobileLoginHandler', error);
      return res.status(400).json({ error: { message: error.message } });
    }
    const { brandId }: { brandId: BrandId } = (req.params: any);

    let player;
    try {
      player = await authenticateByMobilePhone(brandId, loginData.mobilePhone, loginData.ipAddress);
    } catch (err) {
      if (err.error) {
        return res.status(400).json(err);
      }
      throw err;
    }
    return await processLogin(req, res, loginData, player);
  } catch (e) {
    logger.warn('mobileLoginHandler failed', e);
    return next(e);
  }
};

const loginHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { error, value: loginData } = loginSchema.validate(req.body);
    if (error) {
      logger.warn('loginHandler', error);
      return res.status(400).json({ error: { message: error.message } });
    }
    const { brandId }: { brandId: BrandId } = (req.params: any);

    let player;
    try {
      player = await authenticate(brandId, loginData.email, loginData.password, loginData.ipAddress);
    } catch (err) {
      if (err.error) {
        return res.status(400).json(err);
      }
      throw err;
    }
    return await processLogin(req, res, loginData, player);
  } catch (e) {
    logger.warn('loginHandler failed', e);
    return next(e);
  }
};

const requestLoginHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const value: RequestLoginRequest = validate(req.body, requestLoginSchema, 'requestLoginHandler schema validation failed');
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const query = {
      email: value.email,
      mobilePhone: value.mobilePhone,
    };

    const player = await findPlayer(brandId, query);
    if (player == null) {
      logger.warn('requestLoginHandler player not found', query);
      return res.status(404).json({ error: errorCodes.INVALID_LOGIN_DETAILS });
    }

    const response: RequestLoginResponse = {
      mobilePhone: player.mobilePhone,
      pinCode: await PlayerPin.createPin(pg, player.mobilePhone, 'login', 1),
    };
    return res.status(200).json(response);
  } catch (e) {
    logger.warn('requestLoginHandler failed', e);
    return next(e);
  }
};

const completeLoginHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const value: CompleteLoginRequest = validate(req.body, completeLoginSchema, 'completeLoginHandler schema validation failed');
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const { pinCode, ipAddress, userAgent } = value;
    const query = {
      email: value.email,
      mobilePhone: value.mobilePhone,
    };

    const player = await Player.findPlayer(brandId, query);
    if (player == null) {
      logger.warn('completeLoginHandler player not found', query);
      return res.status(404).json({ error: errorCodes.INVALID_LOGIN_DETAILS });
    }

    const isValid = await PlayerPin.validatePin(pg, player.mobilePhone, pinCode, 'login');
    if (!isValid) {
      logger.warn('completeLoginHandler pin validation failed', pinCode);
      return res.status(404).json({ error: errorCodes.INVALID_PIN_CODE });
    }

    const authenticatePlayer = await authenticateByMobilePhone(brandId, player.mobilePhone, ipAddress);

    return await processLogin(req, res, { ipAddress, userAgent }, authenticatePlayer);
  } catch (e) {
    logger.warn('completeLoginHandler failed', e);
    return next(e);
  }
};

const requireAuthentication = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const { brandId }: { brandId: BrandId } = (req.params: any);
  const { authorization } = req.headers;
  if (!authorization) {
    logger.warn('Authentication required', req.originalUrl);
    return res.status(403).send('Authentication required');
  }
  const [type, token] = authorization.split(' ');
  try {
    if (type === 'Token') {
      const session = await getSession(brandId, token);
      if (session != null) {
        req.session = { ...session, brandId };  
        return next();
      }
    } else if (type === 'Bearer') {
      if (brandId == null) {
        logger.warn('brandId not set', req.params);
        return next();
      }
      const player = await findByUsername(brandId, token);
      if (player == null) {
        logger.warn('Authentication failed', type, token);
      } else {
        const session = await getPlayerSession(brandId, player.id);
        if (session != null) {
          req.session = { ...session.d, brandId };  
          return next();
        }
        req.session = { playerId: player.id, brandId, id: 0 };  
        return next();
      }
    } else if (type === 'Beerer') { // TODO: replace with less provoking name
      const [player] = await getByIds([Number(token)]);
      if (player == null) {
        logger.warn('Authentication failed', type, token);
      } else {
        const session = await getPlayerSession(brandId, player.id);
        if (session != null) {
          req.session = { ...session.d, brandId };  
          return next();
        }
        req.session = { playerId: player.id, brandId, id: 0 };  
        return next();
      }
    }
  } catch (err) {
    logger.warn('Authentication failed', err);
    return next(err);
  }
  return res.status(403).send('Authentication required');
};

const logoutHandler = async (req: express$Request, res: express$Response) => {
  await Session.destroy({ brandId: req.session.brandId, id: req.session.playerId }, 'logout');
  res.json({ ok: true });
};

const sessionStatisticsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const session = await Session.get(req.session.playerId, req.session.id);
    if (session === null) {
      return res.status(403).send('Authentication required');
    }
    const { playTimeInMinutes } = session;
    const amountWin = session.win;
    const amountBet = session.bet;
    const amountLost = amountBet - amountWin;

    const statistics = {
      playTimeInMinutes,
      amountWin,
      amountBet,
      amountLost,
    };
    return res.json({ statistics });
  } catch (e) {
    logger.warn('Get session statistics failed');
    return next(e);
  }
};

module.exports = {
  loginHandler,
  processLogin,
  mobileLoginHandler,
  requestLoginHandler,
  completeLoginHandler,
  requireAuthentication,
  logoutHandler,
  sessionStatisticsHandler,
};
