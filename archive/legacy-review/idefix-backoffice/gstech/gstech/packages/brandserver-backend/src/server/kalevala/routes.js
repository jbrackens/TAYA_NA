/* @flow */
const { includes } = require('lodash');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const logger = require('gstech-core/modules/logger');
const repository = require('../common/repository');
const { createJourney } = require('../common/journey');
const { initCommonRoutes, init } = require('../common/common-routes');
const adminRoutes = require('../common/admin-routes');
const shopV1 = require('./shop-v1');
const clientCallback = require('../common/client-callback');
const { handleError } = require('../common/extensions');
const { initCommonPublicRoutes, errorRoutes } = require('../common/public-routes');
const { startGameHandler, startFreeGameHandler } = require('../common/modules/games/routes');
const {
  apiLoggedIn,
  updateDetails,
  checkIpCountry
} = require('../common/router-helpers');
const { shopHandler, buyHandler, useHandler, buyLootbox, openLootbox } = require('./shop');

module.exports = (app: express$Application<>) => {
  init(app);

  if (!process.env.KALEVALA_V2) { // FIXME: kalevala-v2
    shopV1(app);

    app.post('/api/refresh-game/:id', apiLoggedIn, async (req: express$Request, res: express$Response) => {
      try {
        const journey = await createJourney(req, [`game-${req.params.id}`]);
        const game2 = await repository.findGame(req.params.id, journey);
        if (req.context.country.CountryISO && includes(game2.BlockedCountries, req.context.country.CountryISO)) {
          logger.error(`Exited "${req.params.id}" for "${req.context.playerId}" from [${req.context.country.CountryISO}]`);
          throw new Error(errorCodes.GAME_IS_NOT_AVAILABLE.message);
        }
        journey.tags.push(...[`game-${req.params.id}`, `manufacturer-${game2.Manufacturer != null ? game2.Manufacturer.toLowerCase() : ''}`]);

        const banners = journey.updateBanners(req.context, ['game', 'game-leaderboard']);
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

    app.post('/api/start-game/:id', apiLoggedIn, (req: express$Request, res: express$Response) => startGameHandler(req, res, ['game', 'game-leaderboard', 'frontpage']));
  } else {
    app.get('/api/shop', checkIpCountry, apiLoggedIn, shopHandler);
    app.post('/api/shop/:rewardId', checkIpCountry, apiLoggedIn, buyHandler);
    app.post('/api/shop/use/:ledgerId', checkIpCountry, apiLoggedIn, useHandler);
    app.post('/api/shop/lootbox/:rewardId', checkIpCountry, apiLoggedIn, buyLootbox);
    app.post('/api/shop/lb/:rewardId', checkIpCountry, apiLoggedIn, openLootbox);
    app.post('/api/refresh-game/:id', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
      try {
        const journey = await createJourney(req, [`game-${req.params.id}`]);
        const game2 = await repository.findGame(req.params.id, journey);
        if (req.context.country.CountryISO && includes(game2.BlockedCountries, req.context.country.CountryISO)) {
          logger.error(`Exited "${req.params.id}" for "${req.context.playerId}" from [${req.context.country.CountryISO}]`);
          throw new Error(errorCodes.GAME_IS_NOT_AVAILABLE.message);
        }
        journey.tags.push(...[`game-${req.params.id}`, `manufacturer-${game2.Manufacturer != null ? game2.Manufacturer.toLowerCase() : ''}`]);

        const details = await updateDetails(journey);
        const update = {
          balance: journey.balance.ui,
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

    app.post('/api/start-game/:id', checkIpCountry, apiLoggedIn, (req: express$Request, res: express$Response) => startGameHandler(req, res, ['frontpage']));
  }

  app.post('/api/refresh-game/:id', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req, [`game-${req.params.id}`]);
      const game2 = await repository.findGame(req.params.id, journey);
      if (req.context.country.CountryISO && includes(game2.BlockedCountries, req.context.country.CountryISO)) {
        logger.error(`Exited "${req.params.id}" for "${req.context.playerId}" from [${req.context.country.CountryISO}]`);
        throw new Error(errorCodes.GAME_IS_NOT_AVAILABLE.message);
      }
      journey.tags.push(...[`game-${req.params.id}`, `manufacturer-${game2.Manufacturer != null ? game2.Manufacturer.toLowerCase() : ''}`]);

      const banners = journey.updateBanners(req.context, ['game', 'game-leaderboard']);
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

  app.post('/api/start-game/:id', checkIpCountry, apiLoggedIn, (req: express$Request, res: express$Response) => startGameHandler(req, res, ['game', 'game-leaderboard', 'frontpage']));
  app.post('/api/start-free-game/:id', (req: express$Request, res: express$Response) => startFreeGameHandler(req, res));

  initCommonRoutes(app);
  adminRoutes(app);
  initCommonPublicRoutes(app);

  app.all('*', (req: express$Request, res: express$Response, next: express$NextFunction) => next('404'));
  app.use(errorRoutes);
};
