/* @flow */
// import type { PlayerDraft } from 'gstech-core/modules/types/player';
import type { DepositMethod } from '../payments/deposits/Deposit';

const _ = require('lodash');
const moment = require('moment-timezone');
const { v1: uuid } = require('uuid');
const validate = require('gstech-core/modules/validate');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const phoneNumber = require('gstech-core/modules/phoneNumber');
const paymentServer = require('gstech-core/modules/clients/paymentserver-api');
const PartialLogin = require('./PartialLogin');
const Player = require('../players/Player');
const {
  failPartialLoginSchema,
  getPartialLoginSchema,
  startPayAndPlayDepositSchema,
  registerPartialPlayerSchema,
  completePlayerRegistrationSchema,
  updatePartialPlayerSchema,
} = require('./api-schemas');
const { checkLogin, getActiveLimits } = require('../limits');
const { addEvent } = require('../players/PlayerEvent');
const { addPlayerFraud, checkRegistrationFrauds } = require('../frauds');
const { findAffiliate } = require('../affiliates');
const { findCountry } = require('../countries');
const { lookup } = require('../core/geoip');
const Person = require('../persons/Person');
const PlayerEvent = require('../players/PlayerEvent');
const Notification = require('../core/notifications');
const EEG = require('../core/notifications-eeg');
const Optimove = require('../core/optimove');
const { getBrandInfo, isWhitelistedIp } = require('../settings');
const { startDeposit, getDepositMethods } = require('../payments/deposits/Deposit');
const { deposits } = require('../payments/Payment');
const { processLogin } = require('../sessions/api-routes');
const { trackSuccessfulLogin } = require('../players/Authenticate');

const getPartialLoginHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> getPartialLoginHandler', { params: req.params, body: req.body });

    const { transactionKey, status } = await validate(
      req.params,
      getPartialLoginSchema,
      'Get Partial Login',
    );
    const partialLogin = await PartialLogin.get(pg, transactionKey, status);

    logger.debug('<<< getPartialLoginHandler', { partialLogin });
    return res.status(200).json(partialLogin);
  } catch (e) {
    logger.error('XXX getPartialLoginHandler', { e, params: req.params, body: req.body });
    return next(e);
  }
};

const startPartialLoginHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> startPartialLoginHandler', { params: req.params, body: req.body });

    const { brandId }: { brandId: BrandId } = (req.params: any);
    const {
      urls,
      client,
      amount,
      bonusId,
      paymentMethod,
      transactionKey,
      player: playerDraft,
    } = await validate(req.body, startPayAndPlayDepositSchema, 'startPartialLoginHandler');
    const p = { ...playerDraft, brandId };
    const [country, ipCountry] = await Promise.all([
      findCountry(brandId, playerDraft.countryId),
      lookup(playerDraft.ipAddress).then((countryCode) =>
        countryCode == null ? null : findCountry(brandId, countryCode),
      ),
    ]);

    if (country == null) throw new Error(errorCodes.IP_BLOCKED_COUNTRY.message);

    if (!isWhitelistedIp(playerDraft.ipAddress) && ipCountry && !ipCountry.registrationAllowed) {
      logger.debug('Registration not allowed from', ipCountry);
      throw new Error(errorCodes.IP_BLOCKED_COUNTRY.message);
    }

    const incomingPartialParams = { bonusId };

    const deposit = await PartialLogin.create(pg, {
      transactionKey,
      amount,
      paymentMethod,
      ...playerDraft,
      parameters: incomingPartialParams,
    });
    const brandInfo = await getBrandInfo(brandId);
    const registerRequest = {
      player: {
        brandId,
        username: uuid(),
        languageId: p.languageId,
        currencyId: p.currencyId,
        countryId: p.countryId,
      },
      deposit: {
        ...deposit,
      },
      brand: brandInfo,
      urls,
      client,
    };

    const result =
      amount === 0
        ? await paymentServer.login(registerRequest)
        : await paymentServer.register(registerRequest);

    if (result && result.parameters)
      await PartialLogin.appendParams(pg, transactionKey, result.parameters);

    const resp = { ..._.omit(result, 'parameters'), transactionKey: deposit.transactionKey };

    logger.debug('<<< startPartialLoginHandler', { resp });
    return res.json(resp);
  } catch (e) {
    logger.error('XXX startPartialLoginHandler', { e, params: req.params, body: req.body });
    return next(e);
  }
};

const completePartialLoginHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> completePartialLoginHandler', { params: req.params, body: req.body });
    const { transactionKey }: { brandId: BrandId, transactionKey: string } = (req.params: any);
    const { ipAddress, userAgent } = req.body;
    const logPrefix = `completePartialLoginHandler [${transactionKey}]`;

    const partialLogin = await PartialLogin.get(pg, transactionKey);
    if (!partialLogin || partialLogin.status !== 'verified') {
      const error = `${logPrefix}: expected 'verified', got '${partialLogin?.status ?? 'null'}'`;
      logger.debug(error);
      return res.status(400).json({ error });
    }
    const hours = moment().diff(moment(partialLogin.timestamp), 'hours');
    if (hours > 2) throw new Error(`${logPrefix}: partialLogin is too old`);
    if (!partialLogin.playerId) throw new Error(`${logPrefix}: partialLogin has no playerId`);
    let player;
    try {
      player = await Player.getPlayerWithDetails(partialLogin.playerId);
    } catch (err) {
      if (err.error) return res.status(400).json(err);
      throw err;
    }
    await PartialLogin.complete(pg, transactionKey);

    await trackSuccessfulLogin(player.id);
    return await processLogin(req, res, { ipAddress, userAgent }, player);
  } catch (e) {
    logger.error('XXX completePartialLoginHandler', { e, params: req.params, body: req.body });
    return next(e);
  }
};

const registerPartialPlayerHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> registerPartialPlayerHandler', { params: req.params, body: req.body });
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const { transactionKey, player: playerDraft } = await validate(
      req.body,
      registerPartialPlayerSchema,
      'registerPartialPlayerHandler',
    );
    const partialLogin = await PartialLogin.get(pg, transactionKey, 'started');
    if (!partialLogin)
      throw new Error(`partialLogin not found for transactionKey: ${transactionKey}`);
    const [affiliate, country, ipCountry] = await Promise.all([
      findAffiliate(partialLogin.affiliateRegistrationCode),
      findCountry(brandId, playerDraft.countryId),
      lookup(partialLogin.ipAddress).then((countryCode) =>
        countryCode == null ? null : findCountry(brandId, countryCode),
      ),
    ]);
    if (country == null) throw new Error(errorCodes.IP_BLOCKED_COUNTRY.message);
    const currentAge = moment().diff(moment(playerDraft.dateOfBirth), 'years');
    if (currentAge < country.minimumAge) throw new Error(errorCodes.GAMBLING_AGE.message);
    const playersWithGamblingProblems = await Player.findPartialPlayersWithGamblingProblem(
      playerDraft,
    );
    if (playersWithGamblingProblems.length > 0) {
      logger.warn('!!! registerPartialPlayerHandler::validateRegistration FAILED', {
        playerDraft,
        playersWithGamblingProblems,
      });
      throw new Error(errorCodes.GAMBLING_PROBLEM.message);
    }
    const p = {
      brandId,
      languageId: partialLogin.languageId,
      currencyId: partialLogin.currencyId,
      countryId: partialLogin.countryId,
      ipAddress: partialLogin.ipAddress,
      tcVersion: partialLogin.tcVersion,
      affiliateRegistrationCode: partialLogin.affiliateRegistrationCode,
      registrationSource: partialLogin.registrationSource,
      ...playerDraft,
      affiliateId: affiliate != null ? affiliate.id : null,
    };

    let eventType;
    let player = await Player.findByNationalId(brandId, p.countryId, p.nationalId);
    if (player) eventType = ['activity', 'login'];
    else {
      player = await Player.createPartial(p);
      eventType = ['account', 'registration'];
    }

    const { exclusion, error: exclusionError } = await checkLogin(player.id);
    if (exclusionError) {
      await addEvent(player.id, undefined, 'activity', 'loginExclusionBlocked', {
        exclusionKey: exclusion?.exclusionKey,
      });
      const resp = { exclusion, error: exclusionError };
      logger.warn('<<< registerPartialPlayerHandler::exclusionError', { resp });
      return res.status(400).json(resp);
    }

    await PlayerEvent.addEvent(player.id, null, ...eventType, {
      IPAddress: partialLogin.ipAddress,
    });
    if (ipCountry && country.id !== ipCountry.id)
      await addPlayerFraud(player.id, 'registration_ip_country_mismatch', ipCountry.id, {
        ipCountry: ipCountry.id,
        country: country.id,
        ipAddress: partialLogin.ipAddress,
      });

    const isDeposit = partialLogin.amount > 0;
    const noPrevDeposits = (await deposits(player.id, 1)).length === 0;
    if (isDeposit) {
      const depositMethods = await getDepositMethods(player.id);
      const selectedMethod: ?DepositMethod = _.find(
        depositMethods,
        ({ provider }) => provider === partialLogin.paymentMethod,
      );
      if (selectedMethod == null) {
        const resp = { error: errorCodes.INVALID_PAYMENT_METHOD };
        logger.warn('<<< registerPartialPlayerHandler::InvalidPaymentMethod', { resp });
        return res.status(400).json(resp);
      }

      const bonusId = noPrevDeposits ? partialLogin?.parameters?.bonusId || null : null;

      // TODO: wrap in transaction
      await startDeposit(
        player.id,
        selectedMethod.providerId,
        partialLogin.amount,
        bonusId,
        null,
        null,
        null,
        transactionKey,
      );
    } else if (noPrevDeposits) {
      const resp = { error: errorCodes.PNP_LOGIN_WITHOUT_DEPOSITS };
      logger.warn('<<< registerPartialPlayerHandler::LoginWithoutDeposits', {
        player,
        transactionKey,
        ...resp,
      });
      return res.status(400).json(resp);
    }
    await PartialLogin.verify(pg, transactionKey, player.id);
    const resp = { transactionKey, player, isDeposit }; // TODO: need a better design than isDeposit key

    logger.debug('<<< registerPartialPlayerHandler', { resp });
    return res.status(201).json(resp);
  } catch (e) {
    logger.error('XXX registerPartialPlayerHandler', { e, params: req.params, body: req.body });
    return next(e);
  }
};

const completePartialPlayerHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> completePartialPlayerHandler', { params: req.params, body: req.body });

    const playerUpdate = await validate(
      req.body,
      completePlayerRegistrationSchema,
      'Complete partial player registration',
    );
    const pd = { ...playerUpdate, mobilePhone: phoneNumber.parse(playerUpdate.mobilePhone) };
    const player = await Player.completePartial(Number(req.params.playerId), pd);

    const samePlayers = (
      await Player.findMatchingPlayers({ mobilePhone: pd.mobilePhone, email: pd.email })
    ).filter(({ id }) => id !== player.id);

    try {
      if (samePlayers.length > 0) {
        const samePlayer = samePlayers[0];
        await pg.transaction(async (tx) => {
          await Person.connectPlayersWithPerson(tx, samePlayer.id, player.id);
          await addEvent(samePlayer.id, undefined, 'account', 'connectPlayerToPerson', {
            playerId: samePlayer.id,
            pId: player.id,
          }).transacting(tx);
        });
      }
    } catch (e) {
      logger.warn('!!! completePartialPlayerHandler', 'failed to connect players', {
        player,
        samePlayers,
      });
    }

    await checkRegistrationFrauds(player);

    // TODO: reason should probably show the payment provider, but currently it should always be Brite
    await Player.updateAccountStatus(player.id, { verified: true, reason: 'Verified by Brite' });

    const activeExclusion = await getActiveLimits(player.id, 'exclusion');
    if (activeExclusion) {
      const { playerId: excludedPlayerId } = activeExclusion;
      const excludedPlayer = _.find(samePlayers, ({ id }) => id === excludedPlayerId);
      const exclusionBrand = excludedPlayer?.brandId || 'other brand';
      await Player.updateAccountStatus(player.id, {
        allowGameplay: false,
        reason: `Detected active exclusion on ${exclusionBrand}. (${activeExclusion.exclusionKey})`,
      });
    }

    const playersWithGamblingProblems = await Player.findPlayersWithGamblingProblem(playerUpdate);
    if (playersWithGamblingProblems.length > 0) {
      await Player.updateAccountStatus(player.id, { allowGameplay: false });
      await addPlayerFraud(player.id, 'pnp_player_gambling_problem', '');
    }

    await Notification.updatePlayer(player.id, 'Registration');
    await EEG.notifyPlayerRegistration(player.id, pg);
    await Optimove.notifyPlayerRegistration(player.id, pg);

    logger.debug('<<< completePartialPlayerHandler', { player });
    return res.status(200).json(player);
  } catch (e) {
    logger.error('XXX completePartialPlayerHandler', { e, params: req.params, body: req.body });
    return next(e);
  }
};

const updatePartialPlayerHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> updatePartialPlayerHandler', { params: req.params, body: req.body });

    const playerUpdate = await validate(
      req.body,
      updatePartialPlayerSchema,
      'Update partial player registration',
    );
    const player = await Player.updatePartial(Number(req.params.playerId), playerUpdate);

    logger.debug('<<< updatePartialPlayerHandler', { player });
    return res.status(200).json(player);
  } catch (e) {
    logger.warn('XXX updatePartialPlayerHandler', { e, params: req.params, body: req.body });
    return next(e);
  }
};

const failPartialLoginHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> failPartialLoginHandler', { params: req.params, body: req.body });

    const { transactionKey, parameters } = await validate(
      { ...req.params, parameters: req.body },
      failPartialLoginSchema,
      'Fail Partial Login',
    );
    const partialLogin = await pg.transaction(async (tx) => {
      const alreadyFailedPartial = await PartialLogin.get(tx, transactionKey, 'failed');
      if (!alreadyFailedPartial) await PartialLogin.fail(tx, transactionKey);
      const updatedParameters = alreadyFailedPartial?.parameters
        ? _.mergeWith(alreadyFailedPartial?.parameters, parameters, (m1, m2) =>
            !_.startsWith(m1, m2) ? _.join(_.compact([m2, m1]), ' | ') : m1,
          )
        : parameters;
      return await PartialLogin.updateParams(tx, transactionKey, updatedParameters);
    });

    logger.debug('<<< failPartialLoginHandler', { partialLogin });
    return res.status(200).json(partialLogin);
  } catch (e) {
    logger.error('XXX failPartialLoginHandler', { e, params: req.params, body: req.body });
    return next(e);
  }
};

module.exports = {
  failPartialLoginHandler,
  getPartialLoginHandler,
  startPartialLoginHandler,
  completePartialLoginHandler,
  registerPartialPlayerHandler,
  completePartialPlayerHandler,
  updatePartialPlayerHandler,
};
