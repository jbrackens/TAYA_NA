/* @flow */
import type { $Request, $Response, NextFunction } from 'express';

const logger = require('./logger');

const healthCheck = (req: $Request, res: $Response) => {
  res.json({ ok: true });
};

const unknownRequest = (req: $Request, res: $Response, next: NextFunction) => {
  logger.warn('Unknown Request', req.method, req.url, req.body);
  res.status(404).json({ error: { message: 'Resource Not Found' } });
  next();
};

const unhandledError = (err: Error, req: $Request, res: $Response, next: NextFunction) => { // eslint-disable-line no-unused-vars
  logger.error('Unhandled Error', req.method, req.url, req.body, err);
  res.status(500).json({ error: { message: err.message || 'Internal Server Error' } });
};

module.exports = {
  healthCheck,
  unknownRequest,
  unhandledError,
};
