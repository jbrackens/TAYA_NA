/* @flow */
const { includes } = require('lodash');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const logger = require('gstech-core/modules/logger');
const repository = require('../common/repository');
const { createJourney } = require('../common/journey');
const {  initCommonRoutes, init } = require('../common/common-routes');
const adminRoutes = require('../common/admin-routes');
const clientCallback = require('../common/client-callback');
const { handleError } = require('../common/extensions');
const { initCommonPublicRoutes, errorRoutes } = require('../common/public-routes');
const { startGameHandler, startFreeGameHandler } = require('../common/modules/games/routes');
const {
  apiLoggedIn,
  updateDetails,
  checkIpCountry
} = require('../common/router-helpers');
const shopV1 = require('../kalevala/shop-v1');

module.exports = (app: express$Application<express$Request, express$Response>) => {
  init(app);
  shopV1(app);

  app.post('/api/refresh-game/:id', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req, [`game-${req.params.id}`]);
      const game2 = await repository.findGame(req.params.id, journey);
      if (req.context.country.CountryISO && includes(game2.BlockedCountries, req.context.country.CountryISO)) {
        logger.error(`Exited "${req.params.id}" for "${req.context.playerId}" from [${req.context.country.CountryISO}]`);
        throw new Error(errorCodes.GAME_IS_NOT_AVAILABLE.message);
      }
      journey.tags.push(...[`game-${req.params.id}`, `manufacturer-${game2.Manufacturer != null ? game2.Manufacturer.toLowerCase() : ''}`]);
      const update = {
        banners: journey.updateBanners(req.context, ['game', 'game-leaderboard']),
        details: await updateDetails(journey),
      };
      const callbacks = await clientCallback.expose(req);
      return res.json({
        update: { ...update, ...callbacks },
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.post('/api/start-game/:id', checkIpCountry, apiLoggedIn, (req: express$Request, res: express$Response) => startGameHandler(req, res, ['game', 'game-leaderboard', 'frontpage']));
  app.post('/api/start-free-game/:id', (req: express$Request, res: express$Response) => startFreeGameHandler(req, res));

  initCommonRoutes(app);
  adminRoutes(app);
  initCommonPublicRoutes(app);

  app.all('*', (req: express$Request, res: express$Response, next: express$NextFunction) => next('404'));
  app.use(errorRoutes);
};
