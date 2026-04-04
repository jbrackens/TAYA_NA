/* @flow */
import type { $Request, $Response, NextFunction } from 'express';

const { OAuth2Client } = require('google-auth-library');
const config = require('./config');
const logger = require('./logger');

const googleClient = new OAuth2Client(config.googleClientID);

const googleMiddleware =
  (required: boolean): any =>
  async (req: $Request, res: $Response, next: NextFunction): Promise<mixed> => {
  try {
    const googleToken = req.cookies && req.cookies.Google_Authorization;
    if (required && !config.isTest && !googleToken && !config.isLocal) {
      return res.status(401).json({ error: { message: 'Access denied. No token provided.' } });
    }

    if (googleToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: config.googleClientID,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        return res.status(401).json({ error: { message: 'Access denied. Invalid token.' } });
      }

      // Optionally: Verify user's domain if needed
      // if (payload['hd'] !== 'expectedDomain.com') {
      //   return res.status(401).json({ error: { message: 'Access denied. Invalid domain.' } });
      // }

      req.session = req.session || {};
      req.session.googleUser = payload;
    }

    return next();
  } catch (error) {
    logger.error('Google SSO authorization error', error);
    return res.status(401).json({ error: { message: 'Access denied. Invalid token.' } });
  }
};

module.exports = {
  requiredGoogleMiddleware: (googleMiddleware(true): (req: $Request, res: $Response, next: NextFunction) => Promise<mixed>),
  optionalGoogleMiddleware: (googleMiddleware(false): (req: $Request, res: $Response, next: NextFunction) => Promise<mixed>),
};

