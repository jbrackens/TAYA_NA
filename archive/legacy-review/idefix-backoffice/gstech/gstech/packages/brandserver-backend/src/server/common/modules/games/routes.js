/* @flow */
const { includes } = require('lodash');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const configuration = require('../../configuration');
const logger = require('../../logger');
const repository = require('../../repository');
const { handleError } = require('../../extensions');
const clientCallback = require('../../client-callback');
const { updateDetails, redirectScript } = require('../../router-helpers');
const { createJourney } = require('../../journey');
const { isValidSession } = require('../session');
const { getFullBalance } = require('../balance');
const { getNumberOfPendingWithdrawals } = require('../withdraw');
const { BalanceInfo } = require('../../balance-info');
const { launchFreeGame, launchGame } = require('./index');
const temporaryForm = require('./temporary-form');

const startGameHandler = async (req: express$Request, res: express$Response, banners: string[]): Promise<express$Response> => {
  try {
    const game = await repository.getGame(req.params.id);
    if (req.context.country.CountryISO && includes(game.BlockedCountries, req.context.country.CountryISO)) {
      logger.error(`Blocked "${req.params.id}" for "${req.context.playerId}" from [${req.context.country.CountryISO}]`);
      throw new Error(errorCodes.GAME_IS_NOT_AVAILABLE.message);
    }
    const g = await launchGame(req, game);
    const journey = await createJourney(req, [`game-${req.params.id}`]);
    const game2 = await repository.findGame(req.params.id, journey);
    journey.tags.push(...[`game-${req.params.id}`, `manufacturer-${game2.Manufacturer != null ? game2.Manufacturer.toLowerCase() : ''}`]);
    const update = {
      banners: journey.updateBanners(req.context, banners),
      details: await updateDetails(journey),
    };
    const callbacks = await clientCallback.expose(req);
    const r = {
      game: g,
      mobile: req.context.mobile,
      update: { ...update, ...callbacks },
      usingbonusmoney: journey.checkTags(['usingbonusmoney']),
    };

    logger.debug('startGame', req.user.username, journey.tags, r);

    return res.json(r);
  } catch (e) {
    if (e.ErrorNo === 904) {
      return res.json({ game: { ForceFullscreen: true, GameURL: configuration.requireActivationPath(), MaltaJurisdiction: true } });
    }
    return handleError(req, res, e);
  }
};

const startFreeGameHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const gamer = await repository.findFreeGame(req.params.id);
    const game = await launchFreeGame(req, gamer);
    const update = await clientCallback.expose(req);
    return res.json({
      game,
      mobile: req.context.mobile,
      update,
    });
  } catch (e) {
    return handleError(req, res, e);
  }
};

const closeGameHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const value = await isValidSession(req);
    if (value) {
      const [balance, pendingWithdraws] = await Promise.all([getFullBalance(req), getNumberOfPendingWithdrawals(req)]);
      return res.json({
        depleted: new BalanceInfo(balance).isDepleted(0),
        update: {
          balance: balance.ui,
          pendingWithdraws,
        },
      });
    }
    return res.json({ ok: true });
  } catch (e) {
    return handleError(req, res, e);
  }
};

const getGameFormHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    return temporaryForm.showForm(req, res, req.params.id);
  } catch (e) {
    return res.send(redirectScript('/api/deposit/fail'));
  }
};

module.exports = {
  startGameHandler,
  startFreeGameHandler,
  closeGameHandler,
  getGameFormHandler,
};
