/* @flow */
import type { $Request, $Response, NextFunction } from 'express';

const Boom = require('@hapi/boom');

const logger = require('./logger');
const config = require('./config');

const production = process.env.NODE_ENV === 'production';

const healthCheck = (req: $Request, res: $Response) => {
  res.json({ ok: true });
};

const unknownRequest = (req: $Request, res: $Response, next: NextFunction) => {
  const from = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  logger.warn(`Unknown Request`, from, req.method, req.url, req.body);
  res.status(404).json({ error: { message: 'Resource Not Found' } });
  next();
};

const unhandledError = (err: Error, req: $Request, res: $Response, next: NextFunction) => { // eslint-disable-line no-unused-vars
  logger.error('Unhandled Error', req.method, req.url, req.body, err);
  res.status(500).json({ error: { message: err.message || 'Internal Server Error' } });
};

const requireAuthenticationToken = (serverName: 'campaignServer' | 'rewardServer'): ((
  req: $Request,
  res: $Response,
  next: NextFunction
) => mixed) => (req: $Request, res: $Response, next: NextFunction) => {
  const { authToken } = config.api[serverName];
  if (production || authToken != null) {
    if (req.headers['x-token'] !== authToken || authToken == null) {
      return next(Boom.unauthorized('Invalid token'));
    }
  }
  return next();
};

module.exports = {
  healthCheck,
  unknownRequest,
  unhandledError,
  requireAuthenticationToken,
};
