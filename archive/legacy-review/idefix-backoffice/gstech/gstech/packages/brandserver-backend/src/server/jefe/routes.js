/* @flow */
import type { GameWithThumbnail } from "gstech-core/modules/types/rewards";
import type { BountyDefinition } from "./import-tools";

const _ = require('lodash');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const { localize } = require('../common/localization');
const repository = require('../common/repository');
const logger = require('../common/logger');
const utils = require('../common/utils');
const { createJourney } = require('../common/journey');
const { initCommonRoutes, init } = require('../common/common-routes');
const adminRoutes = require('../common/admin-routes');
const jefewheel = require('./jefe-wheel');
const clientCallback = require('../common/client-callback');
const bounties = require('./bounties');
const { handleError } = require('../common/extensions');
const { initCommonPublicRoutes, errorRoutes } = require('../common/public-routes');
const notifications = require('../common/notifications');
const { startGameHandler, startFreeGameHandler } = require('../common/modules/games/routes');
const {
  apiLoggedIn,
  updateDetails,
  checkIpCountry
} = require('../common/router-helpers');

const getWheelTemplate = (
  spinResult: {
    bounty: ?BountyDefinition,
    game: ?GameWithThumbnail,
    id: ?string,
  },
) => {
  const type = spinResult.bounty && spinResult.bounty.type;
  if (type === 'freespins') {
    return jefewheel.freespinsTemplate;
  }
  if (type === 'grandejackpot' || type === 'tinyjackpot' || type === 'minijackpot') {
    return jefewheel.jackpotTemplate;
  }
  return (p: any) => ''; // eslint-disable-line
};

module.exports = (app: express$Application<>) => {
  init(app);

  app.get('/api/bounties', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req);
      const b = await journey.bounties();
      return res.json({
        bounties: b.map(bounty => ({
          ...bounty,
          type: bounty.type,
          id: bounty.id,
        })),
        update: {
          balance: journey.balance.ui,
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myjefe-bounty', 'frontpage']),
        },
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.post('/api/wheel', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const spinResult = await bounties.spinWheel(req);
      logger.debug('SpinResult', spinResult);
      const template = getWheelTemplate(spinResult);
      const journey = await createJourney(req);
      const { bounty, game } = spinResult;
      const d = {
        spintype: bounty != null ? bounty.spintype : undefined,
        spins: bounty != null ? bounty.spins : undefined,
        game: game != null ? game.name : undefined,
      };
      const doLocalize = (key: string) => localize(req.context.languageISO, utils.localizeDefaults(req.context))(key, d);
      const html = template(_.extend({ localize: doLocalize }, d));
      const wheelCount = await journey.wheel();
      const result = {
        bounty: bounty || { type: 'nowin' },
        html,
        morespins: wheelCount > 0,
        level: journey.level(),
        update: {
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myjefe-wheel', 'frontpage']),
        },
      };
      logger.debug('Wheel spin', result);
      return res.json(result);
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.get('/api/wheel', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req);
      const doLocalize = (key: string) => localize(req.context.languageISO, utils.localizeDefaults(req.context))(key);
      const content = {
        title: doLocalize('jefe.wheel.unlocked.header'),
        body: doLocalize('jefe.wheel.unlocked.text'),
      };
      return res.json({
        level: journey.level(),
        showWheel: journey.balance.NumDeposits > 2,
        content,
        update: {
          balance: journey.balance.ui,
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myjefe-wheel', 'frontpage']),
        },
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.get('/api/account', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req);
      const n = await notifications.forUser(req, journey, 'myjefe');
      const notification = _.first(n);
      return res.json({
        account: notification,
        update: {
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myjefe-level', 'frontpage']),
        },
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.post('/api/bounties/deposit/:id', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req);
      const bounty = await bounties.redeemDepositBonus(journey, req.params.id);
      logger.debug('REDEEM', req.params.id, bounty);
      if (bounty === false) {
        return res.sendStatus(404);
      }

      return res.json({
        update: {
          balance: journey.balance.ui,
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myjefe-bounty', 'frontpage']),
        },
        bounty,
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.post('/api/bounties/:id', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req);
      const bountyResult = await bounties.redeem(req, req.params.id);
      if (!bountyResult) {
        return res.sendStatus(404);
      }

      return res.json({
        update: {
          balance: journey.balance.ui,
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myjefe-bounty', 'frontpage']),
        },
        bounty: { action: bountyResult.action },
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.post('/api/refresh-game/:id', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req, [`game-${req.params.id}`]);
      const game2 = await repository.findGame(req.params.id, journey);
      if (req.context.country.CountryISO && _.includes(game2.BlockedCountries, req.context.country.CountryISO)) {
        logger.error(`Exited "${req.params.id}" for "${req.context.playerId}" from [${req.context.country.CountryISO}]`);
        throw new Error(errorCodes.GAME_IS_NOT_AVAILABLE.message);
      }
      journey.tags.push(...[`game-${req.params.id}`, `manufacturer-${game2.Manufacturer != null ? game2.Manufacturer.toLowerCase() : ''}`]);
      const banners = await journey.updateBanners(req.context, ['game-level', 'game-wheel', 'game-bounty']);
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

  app.post('/api/start-game/:id', checkIpCountry, apiLoggedIn, (req: express$Request, res: express$Response) => startGameHandler(req, res, ['game-level', 'game-wheel', 'game-bounty', 'frontpage']));
  app.post('/api/start-free-game/:id', (req: express$Request, res: express$Response) => startFreeGameHandler(req, res));

  initCommonRoutes(app);
  adminRoutes(app);
  initCommonPublicRoutes(app);

  app.all('*', (req: express$Request, res: express$Response, next: express$NextFunction) => next('404'));
  app.use(errorRoutes);
};
