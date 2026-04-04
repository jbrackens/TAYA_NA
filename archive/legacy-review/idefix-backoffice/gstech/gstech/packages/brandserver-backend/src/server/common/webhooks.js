/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';

const logger = require('./logger');
const { mapPlayerDetails } = require('./api');
const configuration = require('./configuration');
const { updatePlayerCache } = require('./modules/legacy-player');

const bind = (app: express$Application<>) => {
  app.post('/api/integration/players', async (req: express$Request, res: express$Response, next: express$NextFunction) => {
    if (configuration.apiKey() != null && req.headers['x-token'] !== configuration.apiKey()) {
      logger.warn('API access with invalid token', req.headers);
      return res.status(400).send({ ok: false, message: 'Invalid authentication' });
    }
    try {
      const { body } = req;
      const p: PlayerWithDetails = body.player;
      const player = mapPlayerDetails(p);
      await updatePlayerCache(player);
      res.send({ ok: true });
    } catch (e) {
      logger.error('User update failed', e);
      next(e);
    }
  });
};
module.exports = { bind };
