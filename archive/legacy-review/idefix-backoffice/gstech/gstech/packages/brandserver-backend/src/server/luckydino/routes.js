/* @flow */
const { includes } = require('lodash');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const logger = require('gstech-core/modules/logger');
const repository = require('../common/repository');
const { createJourney } = require('../common/journey');
const { initCommonRoutes, init }  = require('../common/common-routes');
const adminRoutes = require('../common/admin-routes');
const rewards = require('./rewards');
const clientCallback = require('../common/client-callback');
const { handleError } = require('../common/extensions');
const { initCommonPublicRoutes, errorRoutes } = require('../common/public-routes');
const { startGameHandler, startFreeGameHandler } = require('../common/modules/games/routes');
const {
  apiLoggedIn,
  checkIpCountry,
  updateDetails,
} = require('../common/router-helpers');

module.exports = (app: express$Application<>) => {
  init(app);

  app.get('/api/rewards', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req);
      const rewards = await journey.rewards();
      return res.json({
        rewards,
        update: {
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myaccount-rewards']),
        },
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.post('/api/rewards/:id', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req);
      const reward = await rewards.use(req, req.params.id);
      logger.debug('REDEEM', req.params.id, reward);
      if (!reward) {
        return res.sendStatus(404);
      }
      journey.tags.push(`credited-reward-${reward.id}`);

      return res.json({
        update: {
          balance: journey.balance.ui,
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myaccount-rewards']),
        },
        reward: { action: reward.action },
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.post('/api/refresh-game/:id', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req, [`game-${req.params.id}`]);
      const game2 = await repository.findGame(req.params.id, journey);
      if (req.context.country.CountryISO && includes(game2.BlockedCountries, req.context.country.CountryISO)) {
        logger.error(`Exited "${req.params.id}" for "${req.context.playerId}" from [${req.context.country.CountryISO}]`);
        throw new Error(errorCodes.GAME_IS_NOT_AVAILABLE.message);
      }
      journey.tags.push(...[`game-${req.params.id}`, `manufacturer-${game2.Manufacturer != null ? game2.Manufacturer.toLowerCase() : ''}`]);
      const banners = await journey.updateBanners(req.context, ['game']);
      const details = await updateDetails(journey);
      const update = {
        balance: journey.balance.ui,
        banners,
        details,
      };
      const callbacks = await clientCallback.expose(req);
      return res.json({
        update: { ...update, ...callbacks },
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.post('/api/start-game/:id', checkIpCountry, apiLoggedIn, (req: express$Request, res: express$Response) => startGameHandler(req, res, ['game']));
  app.post('/api/start-free-game/:id', (req: express$Request, res: express$Response) => startFreeGameHandler(req, res));

  initCommonRoutes(app);
  adminRoutes(app);
  initCommonPublicRoutes(app);

  app.all('*', (req: express$Request, res: express$Response, next: express$NextFunction) => next('404'));
  app.use(errorRoutes);
};
