// @flow
import type { Affiliate } from '../../../../types/repository/affiliates';
import type { AffiliateToken } from '../../../../types/repository/auth';

const jwt = require('jsonwebtoken');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const { validateApiToken } = require('../api/middleware');
const { checkAffiliate, checkChildAffiliate, checkUser, checkGoogleUser } = require('../common');

const generateAuthToken = (affiliate: Affiliate): string => {
  const payload: AffiliateToken = {
    affiliateId: affiliate.id,
  };
  const token = jwt.sign(payload, config.affiliateAuthSecret);
  return token;
};

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
    try {
      const affiliateId = await validateApiToken(req);
      if (affiliateId) {
        req.session = { affiliateId };
        return next();
      }

      const affiliate = await checkAffiliate(req);
      if (!affiliate) {
        logger.warn('Affiliate auth error. Affiliate token not found.', { headers: req.headers });
        throw new Error('Affiliate auth error. Affiliate token not found.');
      }

      if (affiliate.isClosed) {
        return res.status(403).json({
          error: { message: 'Affiliate account is closed' },
        });
      }

      req.session = { affiliateId: affiliate.id };
    } catch (err) {
      const user = (await checkGoogleUser(req)) || (await checkUser(req));
      if (!user) {
        logger.warn('Affiliate auth error. User in neither cloudflare user nor normal user.', {
          headers: req.headers,
        });
        return res.status(401).json({ error: { message: 'Access denied.' } });
      }

      const affiliateId = req.headers['affiliate-id'];
      if (!affiliateId) {
        logger.warn('Affiliate auth error. affiliate-id parameter not found in the header.', {
          headers: req.headers,
        });
        return res.status(401).json({ error: { message: 'Access denied.' } });
      }

      req.session = { affiliateId };
    }

    const childId = req.headers['child-id'];
    if (childId) {
      const child = await checkChildAffiliate(req, req.session.affiliateId);
      if (!child) {
        logger.warn(
          `Affiliate auth error. child-id '${childId}' parameter does not belong to affiliate '${req.session.affiliateId}'`,
          { headers: req.headers },
        );
        return res.status(401).json({
          error: { message: 'Access denied.' },
        });
      }

      req.session = { affiliateId: child.id };
    }

    return next();
  } catch (e) {
    logger.error('Affiliate auth error', e);
    return res.status(401).json({ error: { message: 'Access denied.' } });
  }
};

module.exports = {
  generateAuthToken,
  auth,
};
