/* @flow */
import type { $Request, $Response, NextFunction } from 'express';

const jwkToPem = require('jwk-to-pem');
const jwt = require('jsonwebtoken');
const { axios } = require('./axios');
const logger = require('./logger');
const config = require('./config');

const cloudflareMiddleware =
  (required: boolean): any =>
  async (req: $Request, res: $Response, next: NextFunction): Promise<mixed> => {
    try {
      const cloudflareToken = req.cookies && req.cookies.CF_Authorization;
      const { cloudflareCertUrl, cloudflareAudienceTag } = config;

      if (required && !config.isTest && cloudflareCertUrl && !cloudflareToken) {
        return res
          .status(401)
          .json({ error: { message: 'Access denied. Invalid cloudflare token.' } });
      }

      if (cloudflareToken && cloudflareCertUrl) {
        const { data: certs } = await axios.get(cloudflareCertUrl);
        const publicKeys = certs.keys.map((key) => jwkToPem(key));

        const cloudflareUser = publicKeys
          .map((publicKey) => {
            try {
              const opts = cloudflareAudienceTag ? { audience: cloudflareAudienceTag } : {};
              return jwt.verify(cloudflareToken, publicKey, opts);
            } catch {
              return null;
            }
          })
          .find((e) => e);

        if (!cloudflareUser)
          return res.status(401).json({ error: { message: 'Access denied. Invalid token.' } });

        req.session = req.session || {};
        req.session.cloudflareUser = cloudflareUser;
      }

      return next();
    } catch (e) {
      logger.error('cloudflare authorize error', e);
      return res.status(401).json({ error: { message: 'Access denied. Invalid token.' } });
    }
  };

module.exports = {
  requiredCloudflareMiddleware: (cloudflareMiddleware(true): (req: $Request, res: $Response, next: NextFunction) => Promise<mixed>),
  optionalCloudflareMiddleware: (cloudflareMiddleware(false): (req: $Request, res: $Response, next: NextFunction) => Promise<mixed>),
};
