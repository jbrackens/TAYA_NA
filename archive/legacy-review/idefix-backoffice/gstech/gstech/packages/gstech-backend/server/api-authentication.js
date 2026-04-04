/* @flow */
const Boom = require('@hapi/boom');
const { api: { backend: { staticTokens: tokens } } } = require('../config');

const production = process.env.NODE_ENV === 'production';

const requireAuthenticationToken = (req: express$Request, res: express$Response, next: express$NextFunction): mixed => {
  const { brandId }: { brandId: BrandId } = (req.params: any);
  const token = tokens[brandId];
  if (production || token != null) {
    if (req.headers['x-token'] !== token || token == null) {
      return next(Boom.unauthorized('Invalid token'));
    }
  }
  return next();
};

module.exports = { requireAuthenticationToken };
