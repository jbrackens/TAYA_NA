/* @flow */
import type { PlayerDraft } from 'gstech-core/modules/types/player';
import type {
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  CompletePasswordResetRequest,
  CompletePasswordResetResponse,
  RequestRegistrationRequest,
  RequestRegistrationResponse,
  CompleteRegistrationRequest,
  CompleteRegistrationResponse,
  } from 'gstech-core/modules/clients/backend-api-types';
import type { Limit } from "gstech-core/modules/types/limits";
import type { Country } from '../countries/Country';

const _ = require('lodash');
const moment = require('moment-timezone');
const validate = require('gstech-core/modules/validate');
const coreValidate = require('gstech-core/modules/validate');
const phoneNumber = require('gstech-core/modules/phoneNumber');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const { isTestEmail } = require('gstech-core/modules/utils');
const { getPlayerIdByUsername } = require('gstech-core/modules/helpers');
const keys = require('lodash/fp/keys');

const Player = require('./Player');
const Authenticate = require('./Authenticate');
const PlayerEvent = require('./PlayerEvent');
const PlayerToken = require('./PlayerToken');
const PlayerPin = require('./PlayerPin');
const { createSession } = require('../sessions/Session');
const { findAffiliate } = require('../affiliates');
const { findCountry } = require('../countries');
const { lookup } = require('../core/geoip');
const { getAvailableDepositBonuses } = require('../bonuses');
const { addPlayerFraud, checkRegistrationFrauds } = require('../frauds');
const { getActiveLimits, setupAccount } = require('../limits');
const { isWhitelistedIp } = require('../settings');
const Promotion = require('../promotions/Promotion');
const Notification = require('../core/notifications');
const EEG = require('../core/notifications-eeg');
const Optimove = require('../core/optimove')
const Person = require('../persons/Person');

const {
  changePasswordSchema,
  setPasswordSchema,
  updatePlayerDetailsSchema,
  playerDraftSchema,
  resetPasswordSchema,
  requestPasswordRequestSchema,
  requestPasswordResetSchema,
  completePasswordResetSchema,
  requestPlayerRegistrationSchema,
  completePlayerRegistrationSchema,
  queryPlayerSchema,
  addPlayerNoteSchema,
  activateAccountQuerySchema,
  activateAccountBodySchema,
  activateViaEmailVerificationBodySchema,
  tagSchema,
} = require('./api-schemas');

const checkPlayerUniqueness = async (brandId: BrandId, playerDraft: PlayerDraft) => {
  const sameNameDOB = await Player.findPlayerByNameDOB(brandId, playerDraft);
  if (sameNameDOB) return false;
  const sameNamePostCode = await Player.findPlayerByNamePostCode(brandId, playerDraft);
  if (sameNamePostCode) return false;
  const sameNameAddress = await Player.findPlayerByNameAddress(brandId, playerDraft);
  if (sameNameAddress) return false;
  return true;
};

const validateRegistration = async (brandId: BrandId, country: Country, ipCountry: ?Country, playerDraft: PlayerDraft) => {
  if (!isWhitelistedIp(playerDraft.ipAddress) && ipCountry && !ipCountry.registrationAllowed) {
    logger.debug('Registration not allowed from', ipCountry);
    return { error: errorCodes.IP_BLOCKED_COUNTRY };
  }

  const currentAge = moment().diff(moment(playerDraft.dateOfBirth), 'years');
  if (currentAge < country.minimumAge) {
    return { error: errorCodes.GAMBLING_AGE };
  }

  const playerUniquenessOk = await checkPlayerUniqueness(brandId, playerDraft);
  if (!playerUniquenessOk) {
    return { error: errorCodes.PLAYER_ALREADY_EXISTS };
  }

  const playersWithGamblingProblems = await Player.findPlayersWithGamblingProblem(playerDraft);
  if (playersWithGamblingProblems.length > 0) {
    logger.debug('validateRegistration failed', playerDraft, playersWithGamblingProblems);
    return { error: errorCodes.GAMBLING_PROBLEM };
  }

  const playerWithFraudlentClousure = await Player.fingPlayerWithClosureReason(playerDraft, 'fraudulent');
  if (playerWithFraudlentClousure.length > 0) {
    logger.debug('validateRegistration failed', { playerDraft, playerWithFraudlentClousure });
    return { error: errorCodes.FRAUDULENT_BEHAVIOUR };
  }

  return {};
};

const getPlayerDetailsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  const player = await Player.getPlayerWithDetails(Number(req.session.playerId));
  if (player == null) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(200).json(player);
};

const getBalance = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { balance, numDeposits, bonusBalance, currencyId } = await Player.getBalance(req.session.playerId);
    const bonuses = await getAvailableDepositBonuses(req.session.playerId);
    return res.json({
      balance,
      bonusBalance,
      totalBalance: balance + bonusBalance,
      currencyId,
      bonuses,
      numDeposits,
    });
  } catch (e) {
    logger.warn('getBalance failed', e);
    return next(e);
  }
};

const getFullPlayerDetailsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const player = await Player.getPlayerWithDetails(Number(req.session.playerId));
    if (player == null) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { balance, numDeposits, bonusBalance, currencyId } = await Player.getBalance(player.id);
    const bonuses = await getAvailableDepositBonuses(player.id);
    const rawPromotions = await Promotion.getPlayerPromotions(player.id);
    const promotions = rawPromotions.map(Promotion.mapPromotion);
    return res.json({
      balance: {
        balance,
        bonusBalance,
        totalBalance: balance + bonusBalance,
        currencyId,
        numDeposits,
      },
      bonuses,
      player,
      promotions,
    });
  } catch (e) {
    logger.warn('getBalance failed', e);
    return next(e);
  }
};

const changePasswordHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { error, value: query } = changePasswordSchema.validate(req.body);

    if (error) {
      if (error.details && error.details.length > 0) {
        const details = error.details[0];
        if (details.key === 'oldPassword') {
          return res.status(400).json({ error: errorCodes.INVALID_OLD_PASSWORD });
        }

        if (details.key === 'newPassword') {
          return res.status(400).json({ error: errorCodes.INVALID_NEW_PASSWORD });
        }
      }
      return res.status(400).json({
        message: error.message,
      });
    }
    const { oldPassword, newPassword } = query;

    await Authenticate.changePassword(req.session.playerId, oldPassword, newPassword);
  } catch (e) {
    if (e.error) {
      return res.status(400).json(e.error);
    }
    return next(e);
  }

  return res.json({ ok: true });
};

const setPasswordHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { error, value: query } = setPasswordSchema.validate(req.body);

    if (error) {
      if (error.details && error.details.length > 0) {
        const details = error.details[0];
        if (details.key === 'newPassword') {
          return res.status(400).json({ error: errorCodes.INVALID_NEW_PASSWORD });
        }
      }
      return res.status(400).json({
        message: error.message,
      });
    }
    const { newPassword } = query;

    await Authenticate.setPassword(req.session.playerId, newPassword);
  } catch (e) {

      switch(e.error) {
        case errorCodes.INVALID_LOGIN_DETAILS:
          return res.status(400).json(e.error);
        case errorCodes.PASSWORD_ALREADY_SET:
          return res.status(400).json(e.error);
        default:
      }

    return next(e);
  }

  return res.json({ ok: true });
};

const doRegisterPlayer = async (brandId: BrandId, playerDraft: any): any => {
  const [affiliate, country, ipCountry] = await Promise.all([
    findAffiliate(playerDraft.affiliateRegistrationCode),
    findCountry(brandId, playerDraft.countryId),
    lookup(playerDraft.ipAddress).then(countryCode =>
      (countryCode == null ? null : findCountry(brandId, countryCode))),
  ]);

  if (country == null) {
    return Promise.reject({ error: errorCodes.IP_BLOCKED_COUNTRY });
  }

  const { error: validationError } = await validateRegistration(brandId, country, ipCountry, playerDraft);
  if (validationError) {
    return Promise.reject({ error: validationError });
  }

  const mobilePhone = phoneNumber.tryParse(playerDraft.mobilePhone, playerDraft.countryId);
  if (mobilePhone == null) {
    return Promise.reject({ error: errorCodes.INVALID_PHONE_NUMBER });
  }

  const samePlayers = await Player.findMatchingPlayers({ mobilePhone, email: playerDraft.email });
  const activeExclusions = await Promise.all(
    samePlayers.map(async ({ id: playerId }) => await getActiveLimits(playerId, 'exclusion')),
  );
  if (_.compact<Limit>(activeExclusions).length > 0) return Promise.reject({ error: errorCodes.PLAYER_EXCLUDED });

  const sowStates = await Promise.all(
    samePlayers.map(async ({ id: playerId }) => await Player.getSowClearanceState(playerId)),
  );
  if (sowStates.includes('FAIL')) {
    await Promise.all(
      samePlayers.map(
        async ({ id: playerId }) =>
          await PlayerEvent.addEvent(playerId, null, 'account', 'sow.blockedRegistration', {
            IPAddress: playerDraft.ipAddress,
          }),
      ),
    );
    return Promise.reject({ error: errorCodes.SOW_REJECTED });
  }

  const extraData = {
    riskProfile: country.riskProfile,
    brandId,
    mobilePhone,
    affiliateId: affiliate != null ? affiliate.id : null,
    testPlayer: isTestEmail(playerDraft.email),
  };

  const playerResult = await Player.create({ ...playerDraft, ...extraData });

  await PlayerEvent.addEvent(playerResult.id, null, 'account', 'registration', { IPAddress: playerDraft.ipAddress });
  if (ipCountry && country.id !== ipCountry.id) {
    await addPlayerFraud(
      playerResult.id,
      'registration_ip_country_mismatch',
      ipCountry.id,
      { ipCountry: ipCountry.id, country: country.id, ipAddress: playerDraft.ipAddress },
    );
  }

  try {
    if (samePlayers.length > 0) {
      const samePlayer = samePlayers[0];
      await pg.transaction(async (tx) => {
        await Person.connectPlayersWithPerson(tx, samePlayer.id, playerResult.id);
        await PlayerEvent.addEvent(samePlayer.id, undefined, 'account', 'connectPlayerToPerson', {
          playerId: samePlayer.id,
          pId: playerResult.id,
        }).transacting(tx);
      });
    }
  } catch (e) {
    logger.error('failed to connect players', { playerResult, samePlayers });
  }

  await checkRegistrationFrauds(playerResult);

  const { token } = await createSession(playerResult, playerDraft.ipAddress, playerDraft.userAgent);
  await setupAccount(playerResult.id);

  const activationCode = await PlayerToken.createToken(playerResult.id, 'activation', 24 * 14);
  const player = await Player.getPlayerWithDetails(playerResult.id);

  await Optimove.notifyPlayerRegistration(playerResult.id, pg);
  await Notification.updatePlayer(playerResult.id, 'Registration');
  await EEG.notifyPlayerRegistration(playerResult.id, pg);

  return { player, token, activationCode };
};

const updatePlayerDetailsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerUpdate = await validate(req.body, updatePlayerDetailsSchema, 'Validate player details update');
    logger.debug('updatePlayerDetailsHandler', playerUpdate, req.session.playerId);
    const player = await Player.update(req.session.playerId, playerUpdate);
    return res.status(200).json(player);
  } catch (e) {
    logger.warn('updatePlayerDetailsHandler failed', e);
    return next(e);
  }
};

const requestActivationTokenHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const activationToken = await PlayerToken.createToken(req.session.playerId, 'activation', 24 * 7);
    return res.status(200).json({ activationToken });
  } catch (e) {
    logger.warn('requestActivationTokenHandler failed', e);
    return next(e);
  }
};

const activateAccountHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const query = await validate(req.params, activateAccountQuerySchema, 'Activation code');
    const body = await validate(req.body, activateAccountBodySchema, 'Activation code');
    const playerId = await pg.transaction(async (tx) => {
      const pId = await PlayerToken.useToken(query.activationCode, 'activation', tx);
      if (pId !== undefined) await Player.activate(pId, body.ipAddress, tx);
      return pId;
    });
    if (!playerId) return res.status(404).json({ error: errorCodes.INVALID_ACTIVATION_CODE });
    const player = await Player.getPlayerWithDetails(playerId);
    return res.status(200).json(player);
  } catch (e) {
    logger.warn('Player activation failed', e);
    return next(e);
  }
};

const activateViaEmailVerificationHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> activateViaEmailVerificationHandler', { body: req.body });
    const { username, ipAddress } = await validate(
      req.body,
      activateViaEmailVerificationBodySchema,
      'Account activation via email verification',
    );
    const playerId = await pg.transaction(async (tx): Promise<?Id> => {
      const { playerId: pId } = getPlayerIdByUsername(username);
      const { emailStatus } = await Player.getEmailVerificationStatus(pId, tx);
      if (emailStatus === 'verified') {
        await Player.activate(pId, ipAddress, tx);
        return pId;
      }
      return null;
    });
    if (!playerId)
      return res.status(400).json({ error: errorCodes.ACTIVATION_ON_UNVERIFIED_EMAIL });
    const player = await Player.getPlayerWithDetails(playerId);
    logger.debug('<<< activateViaEmailVerificationHandler', { player })
    return res.status(200).json(player);
  } catch (e) {
    logger.warn('!!! activateViaEmailVerificationHandler', { error: e, stack: e.stack });
    return next(e);
  }
}

const requestPasswordResetCodeHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { error, value: query } = requestPasswordRequestSchema.validate(req.body);
    const { brandId }: { brandId: BrandId } = (req.params: any);

    if (error) {
      logger.warn('requestPasswordResetCodeHandler', error);
      if (error.details && error.details.length > 0) {
        const details = error.details[0];
        if (details.key === 'email') {
          return res.status(400).json({ error: errorCodes.INVALID_EMAIL });
        }
      }
      return res.status(400).json({
        message: error.message,
      });
    }

    const player = await Player.findPlayer(brandId, query);
    if (player == null) {
      logger.warn('requestPasswordResetCodeHandler player not found', query);
      return res.status(404).json({ error: errorCodes.INVALID_LOGIN_DETAILS });
    }

    const passwordResetCode = await PlayerToken.createToken(player.id, 'password', 24);
    return res.status(200).json({ passwordResetCode });
  } catch (e) {
    logger.warn('requestPasswordResetCodeHandler failed', e);
    return next(e);
  }
};

const resetPasswordHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { error, value: query } = resetPasswordSchema.validate(req.body);
    if (error) {
      logger.warn('resetPasswordHandler', error);
      if (error.details && error.details.length > 0) {
        const details = error.details[0];
        if (details.key === 'newPassword') {
          return res.status(400).json({ error: errorCodes.INVALID_NEW_PASSWORD });
        }
      }
      return res.status(400).json({
        message: error.message,
      });
    }
    const { newPassword } = query;
    const ok = await pg.transaction(async (tx) => {
      const playerId = await PlayerToken.useToken(req.params.passwordResetCode, 'password', tx);
      if (playerId == null) {
        return false;
      }
      await Authenticate.resetPassword(playerId, newPassword, tx);
      return true;
    });
    if (ok) {
      return res.json({ ok });
    }
    logger.info('Password change failed, token not found');
    return res.status(400).json({ error: errorCodes.PASSWORD_RESET_LINK_INACTIVE });
  } catch (e) {
    logger.warn('Reset password failed');
    return next(e);
  }
};

const requestPasswordResetHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const value: RequestPasswordResetRequest = await coreValidate(
      req.body,
      requestPasswordResetSchema,
      'requestPasswordResetHandler schema validation failed',
    );
    const query = {
      email: value.email,
      mobilePhone: value.mobilePhone,
      dateOfBirth: value.dateOfBirth,
    };
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const player = await Player.findPlayer(brandId, query);
    if (player == null) {
      logger.warn('requestPasswordResetHandler player not found', query);
      return res.status(404).json({ error: errorCodes.INVALID_LOGIN_DETAILS });
    }
    const response: RequestPasswordResetResponse = {
      email: player.email,
      mobilePhone: player.mobilePhone,
      pinCode: await PlayerPin.createPin(pg, player.mobilePhone, 'reset', 1),
    };
    return res.status(200).json(response);
  } catch (e) {
    logger.warn('requestPasswordResetHandler failed', e);
    return next(e);
  }
};

const completePasswordResetHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const value: CompletePasswordResetRequest = await coreValidate(req.body, completePasswordResetSchema, 'completePasswordResetHandler schema validation failed');
    const { pinCode, newPassword } = value;
    const query = {
      email: value.email,
      mobilePhone: value.mobilePhone,
    };
    const { brandId }: { brandId: BrandId } = (req.params: any);

    const player = await Player.findPlayer(brandId, query);
    if (player == null) {
      logger.warn('completePasswordResetHandler player not found', query);
      return res.status(404).json({ error: errorCodes.INVALID_LOGIN_DETAILS });
    }

    const isValid = await PlayerPin.validatePin(pg, player.mobilePhone, pinCode, 'reset');
    if (!isValid) {
      logger.warn('completePasswordResetHandler pin validation failed', { pinCode });
      return res.status(400).json({ error: errorCodes.INVALID_PIN_CODE });
    }

    await pg.transaction(tx => Authenticate.resetPassword(player.id, newPassword, tx));
    const response: CompletePasswordResetResponse = {
      ok: true,
      mobilePhone: player.mobilePhone,
    };
    return res.status(200).json(response);
  } catch (e) {
    logger.warn('completePasswordResetHandler failed', e);
    return next(e);
  }
};

const requestPlayerRegistrationHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const body: RequestRegistrationRequest = await coreValidate(req.body, requestPlayerRegistrationSchema, 'requestPlayerRegistrationHandler schema validation failed');
    const { mobilePhone } = body;
    const pinCode = await PlayerPin.createPin(pg, mobilePhone, 'activate', 1);

    const result: RequestRegistrationResponse = { mobilePhone, pinCode };
    return res.json(result);
  } catch (e) {
    logger.warn('requestPlayerRegistrationHandler failed', e);
    return next(e);
  }
};

const completePlayerRegistrationHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const body: CompleteRegistrationRequest = await coreValidate(req.body, completePlayerRegistrationSchema, 'completePlayerRegistrationHandler schema validation failed');
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const { playerDraft, mobilePhone, pinCode } = body;

    const playerInfo = await pg.transaction(async (tx) => {
      const isValid = await PlayerPin.validatePin(tx, mobilePhone, pinCode, 'activate');
      if (isValid) {
        const info = await doRegisterPlayer(brandId, playerDraft);
        return info;
      }
      return null;
    });
    if (playerInfo) {
      const result: CompleteRegistrationResponse = {
        player: playerInfo.player,
        token: playerInfo.token,
        activationCode: playerInfo.activationCode,
      };
      return res.status(201).json(result);
    }

    logger.warn('completePlayerRegistrationHandler pin validation failed', { mobilePhone, pinCode });
    return res.status(400).json({ error: errorCodes.INVALID_PIN_CODE });
  } catch (e) {
    if (e.constraint) {
      if (e.constraint === 'players_brandId_email_key') {
        return res.status(400).json({ error: errorCodes.DUPLICATE_EMAIL });
      }
      if (e.constraint === 'players_brandId_mobilePhone_key') {
        return res.status(400).json({ error: errorCodes.PHONE_ALREADY_EXISTS });
      }
    }
    logger.warn('completePlayerRegistrationHandler failed', e);
    if (e.error) {
      return res.status(400).json(e);
    }
    logger.error('completePlayerRegistrationHandler failed', e);
    return res.status(400).json({ error: errorCodes.INVALID_INPUT });
  }
};

const registerPlayer = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const playerDraft = await validate(req.body, playerDraftSchema, 'registerPlayer failed');
    const result = await doRegisterPlayer(brandId, playerDraft);
    return res.status(201).json(result);
  } catch (e) {
    if (e.constraint) {
      if (e.constraint === 'players_brandId_email_key') {
        return res.status(400).json({ error: errorCodes.DUPLICATE_EMAIL });
      }
      if (e.constraint === 'players_brandId_mobilePhone_key') {
        return res.status(400).json({ error: errorCodes.PHONE_ALREADY_EXISTS });
      }
    }
    if (e.error) {
      logger.debug('registerPlayer failed', e);
      return res.status(400).json(e);
    }
    logger.debug('Returning invalid input error', e);
    return res.status(400).json({ error: errorCodes.INVALID_INPUT });
  }
};

const queryPlayer = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { error, value: query } = queryPlayerSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const { email, mobilePhone } = query;
    let valid = false;
    const q: {mobilePhone?: ?string, email?: ?string, dateOfBirth?: string } = {};
    if (mobilePhone != null) { q.mobilePhone = phoneNumber.tryParse(mobilePhone); }
    if (email != null) {
      q.email = email;
      valid = await Player.checkEmailFraud(email);
    }
    const player = await Player.findPlayer(brandId, q);
    return res.status(200).json({ exists: player != null, valid });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

const addPlayerNoteHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { content } = await validate(req.body, addPlayerNoteSchema, 'Note add failed');
    await PlayerEvent.addNote(req.session.playerId, null, content);
    return res.status(200).json({});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

const addTag = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const tagDraft = await validate(req.body, tagSchema, 'Add tag failed');
    await Player.addTag(req.session.playerId, tagDraft.tag);
    const tags = await Player.getTags(req.session.playerId);
    return res.status(200).json(keys(tags));
  } catch (err) {
    logger.warn('Add tag failed');
    return next(err);
  }
};

const removeTag = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { tag } = req.params;
    await Player.removeTag(req.session.playerId, tag);
    const tags = await Player.getTags(req.session.playerId);
    return res.status(200).json(keys(tags));
  } catch (err) {
    logger.warn('Remove tag failed');
    return next(err);
  }
};

module.exports = {
  getPlayerDetailsHandler,
  getBalance,
  changePasswordHandler,
  setPasswordHandler,
  resetPasswordHandler,
  requestPasswordResetCodeHandler,
  requestPasswordResetHandler,
  completePasswordResetHandler,
  requestPlayerRegistrationHandler,
  completePlayerRegistrationHandler,
  activateAccountHandler,
  activateViaEmailVerificationHandler,
  updatePlayerDetailsHandler,
  registerPlayer,
  queryPlayer,
  addPlayerNoteHandler,
  requestActivationTokenHandler,
  getFullPlayerDetailsHandler,
  addTag,
  removeTag,
};
