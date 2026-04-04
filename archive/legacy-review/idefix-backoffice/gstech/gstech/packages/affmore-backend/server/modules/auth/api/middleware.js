// @flow
import type { AffiliateSession } from '../../../../types/common';

const HttpError = require('gstech-core/modules/HttpError');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const repository = require('../../admin/affiliates/repository');

const validateApiToken = async (req: express$Request): Promise<?Id> => {
  const { token: apiToken } = req.query;
  if (!apiToken) return null;

  const affiliate = await repository.getAffiliateByToken(pg, apiToken);
  if (!affiliate) throw new HttpError(401, 'Access denied. Invalid token.');
  if (affiliate.isClosed) throw new HttpError(403, 'Affiliate account is closed');

  return affiliate.id;
}

const auth = (): ((
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
) => Promise<mixed> | Promise<express$Response>) => async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const affiliateId = await validateApiToken(req);
    if (!affiliateId) return res.status(401).json({ error: { message: 'Access denied. No token found.' } });

    const session: AffiliateSession = {
      affiliateId,
    };
    req.session = session;

    return next();
  } catch (e) {
    logger.warn('API auth error', req.originalUrl, e);
    return res.status(401).json({ error: { message: 'Access denied. Invalid token.' } });
  }
};

module.exports = {
  validateApiToken,
  auth,
};
