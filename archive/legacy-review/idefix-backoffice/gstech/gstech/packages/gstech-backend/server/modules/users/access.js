/* @flow */
const { v1: uuid, v5: uuid5 } = require('uuid');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const { getSession } = require('./sessionStore');
const User = require('./User');

const namespace = config.userTokenNamespace;

const getToken = (req: express$Request): any | void => {
  const { authorization } = req.headers;
  const [type, token] = authorization !== undefined ? authorization.split(' ') : [];
  return type === 'Token' ? token : undefined;
};

const getGoogleUser = async (req: express$Request) => {
  if (req.session && req.session.googleUser && req.session.googleUser.email) {
    const user = await User.getByEmail(req.session.googleUser.email);
    if (user) {
      return user;
    }
    logger.warn('User not found', req.session.googleUser.email);
  }

  return undefined;
};

const requireAuthentication = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const token = getToken(req);
  if (token) {
    try {
      const session = await getSession(token);
      if (session != null) {
        req.userSession = session;  
        return next();
      }
    } catch (e) {
      logger.error(e);
    }
  }

  const user = await getGoogleUser(req);
  if (user) {
    const sessionId = uuid5(user.email, namespace);
    req.userSession = { id: user.id, sessionId };  
    return next();
  }

  if (process.env.NODE_ENV === 'test' && !req.headers['x-authentication']) {
    logger.info('Skipping authentication in test mode');
    const fakeSession = {
      id: Number(req.headers['x-userid'] || 1),
      sessionId: req.headers['x-sessionid'] || uuid(),
    };
    req.userSession = fakeSession;  
    return next();
  }
  logger.warn('Authentication required', req.originalUrl);
  return res.status(403).send('Authentication required');
};

const requireAdminAccess = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const token = getToken(req);
  if (token) {
    try {
      const session = await getSession(token);
      if (session != null) {
        const user = await User.getById(session.id);

        if (user.administratorAccess) {
          return next();
        }
      }
    } catch (e) {
      logger.error(e);
    }
  }

  const user = await getGoogleUser(req);
  if (user && user.administratorAccess) {
    const sessionId = uuid5(user.email, namespace);
    req.userSession = { id: user.id, sessionId };  
    return next();
  }

  if (process.env.NODE_ENV === 'test' && !req.headers['x-authentication']) {
    logger.info('Skipping administrator access check in test mode');
    return next();
  }
  logger.warn('Administrator access required', req.query);
  return res.status(404).send();
};

const requirePaymentAccess = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const token = getToken(req);
  if (token) {
    try {
      const session = await getSession(token);
      if (session != null) {
        const user = await User.getById(session.id);

        if (user.paymentAccess || user.administratorAccess) {
          return next();
        }
      }
    } catch (e) {
      logger.error(e);
    }
  }

  const user = await getGoogleUser(req);
  if (user && (user.paymentAccess || user.administratorAccess)) {
    const sessionId = uuid5(user.email, namespace);
    req.userSession = { id: user.id, sessionId };  
    return next();
  }

  if (process.env.NODE_ENV === 'test' && !req.headers['x-authentication']) {
    logger.info('Skipping payment access check in test mode');
    return next();
  }
  logger.warn('Payment access required', req.query);
  return res.status(404).send();
};

const requireReportingAccess = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const token = getToken(req);
  if (token) {
    try {
      const session = await getSession(token);
      if (session != null) {
        const user = await User.getById(session.id);

        if (user.reportingAccess || user.administratorAccess) {
          return next();
        }
      }
    } catch (e) {
      logger.error(e);
    }
  }

  const user = await getGoogleUser(req);
  if (user && (user.reportingAccess || user.administratorAccess)) {
    const sessionId = uuid5(user.email, namespace);
    req.userSession = { id: user.id, sessionId };  
    return next();
  }

  if (process.env.NODE_ENV === 'test' && !req.headers['x-authentication']) {
    logger.info('Skipping administrator access check in test mode');
    return next();
  }
  logger.warn('Reporting access required', req.query);
  return res.status(404).send();
};

const requireCampaignAccess = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const token = getToken(req);
  if (token) {
    try {
      const session = await getSession(token);
      if (session != null) {
        const user = await User.getById(session.id);

        if (user.campaignAccess || user.administratorAccess) {
          return next();
        }
      }
    } catch (e) {
      logger.error(e);
    }
  }

  const user = await getGoogleUser(req);
  if (user && (user.campaignAccess || user.administratorAccess)) {
    const sessionId = uuid5(user.email, namespace);
    req.userSession = { id: user.id, sessionId };  
    return next();
  }

  if (process.env.NODE_ENV === 'test' && !req.headers['x-authentication']) {
    logger.info('Skipping administrator access check in test mode');
    return next();
  }
  logger.warn('Campaign access required', req.query);
  return res.status(404).send();
};

module.exports = {
  getToken,
  requireAuthentication,
  requireAdminAccess,
  requirePaymentAccess,
  requireReportingAccess,
  requireCampaignAccess,
};
