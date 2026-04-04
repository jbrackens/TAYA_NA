/* @flow */
import type { Tab } from './query';

const Boom = require('@hapi/boom');
const keys = require('lodash/fp/keys');
const moment = require('moment-timezone');
const includes = require('lodash/fp/includes');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const joi = require('gstech-core/modules/joi');
const logger = require('gstech-core/modules/logger');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const { format, parse } = require('gstech-core/modules/phoneNumber');
const { formatIp } = require('../core/geoip');
const Player = require('./Player');
const PlayerEvent = require('./PlayerEvent');
const Payments = require('../payments/Payment');
const { getPaymentSummary, getPaymentInfo } = require('../payments/Payment');
const { getSessionTotals } = require('../sessions/Session');
const { getTransactionsCount } = require('../transactions/Transaction');
const { search, findByPlayerId, findByPlayerIds } = require('./query');
const { setupAccount } = require('../limits');
const { formatMoney } = require('../core/money');
const {
  updatePlayerSchema,
  searchPlayerSchema,
  updateAccountStatusSchema,
  addEventSchema,
  tagSchema,
  suspendPlayerSchema,
  updateStickyNoteSchema,
  registerPlayerWithGamblingProblemSchema,
} = require('./schemas');
const { checkRegistrationFrauds } = require('../frauds');
const Person = require('../persons/Person');

const tryFormat = (phoneNumber: string, countryId: string) => {
  try {
    return format(phoneNumber, countryId);
  } catch (err) {
    return phoneNumber;
  }
};

const getPlayer = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;

    const player = await findByPlayerId(Number(playerId), req.userSession.id);
    if (player == null) {
      return res.status(404).json({ error: 'Not found' });
    }

    const update = await Player.currentStatus(player.id);
    const result = { ...player, update, mobilePhone: tryFormat(player.mobilePhone, player.countryId) };
    return res.status(200).json(result);
  } catch (err) {
    logger.warn('Get player failed');
    return next(err);
  }
};

const getPlayers = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerIds } = await validate(req.query, joi.object({ playerIds: joi.queryParam().items(joi.number()) }), '');
    const players = await findByPlayerIds(playerIds || [], req.userSession.id);
    return res.status(200).json(players);
  } catch (err) {
    logger.warn('Get players failed');
    return next(err);
  }
};

const updatePlayer = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> => {
  try {
    const { reason, ...playerDraft } = await validate(req.body, updatePlayerSchema, 'Update failed');

    const playerId = Number(req.params.playerId);
    const existingPlayer = await findByPlayerId(playerId, req.userSession.id);
    const transactionsCount = await getTransactionsCount(pg, playerId);
    if (
      transactionsCount > 0 &&
      playerDraft.testPlayer != null &&
      existingPlayer != null &&
      existingPlayer.testPlayer !== playerDraft.testPlayer
    ) {
      const { message } = errorCodes.PLAYER_HAS_TRANSACTIONS;
      return next(Boom.badRequest(message));
    }

    await Player.update(playerId, playerDraft, req.userSession.id, reason);
    if (existingPlayer) {
      await checkRegistrationFrauds(existingPlayer);
      await Person.connectPlayersWithSamePhoneAndEmail(playerId);
    }
    return await getPlayer(req, res, next);
  } catch (err) {
    logger.warn('Update player failed');

    if (err.constraint) {
      if (err.constraint === 'players_brandId_mobilePhone_key') {
        const { message } = errorCodes.PHONE_ALREADY_EXISTS;
        return next(Boom.badRequest(message));
      }

      if (err.constraint === 'players_brandId_email_key') {
        const { message } = errorCodes.DUPLICATE_EMAIL;
        return next(Boom.badRequest(message));
      }
    }

    return next(err);
  }
};

const searchPlayer = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { query: text, brandId, filters } = await validate(req.body, searchPlayerSchema, 'Search failed');
    const { type } = req.query;
    const tab: Tab = ((req.params.tab): any);
    const players = await search(req.userSession.id, tab, { filters, text, brandId, type });
    return res.status(200).json(players);
  } catch (err) {
    logger.warn('Search Player failed');
    return next(err);
  }
};

const getFinancialInfo = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const { playerId } = req.params;
  try {
    const x = await Promise.all([
      Player.getBalance(Number(playerId)),
      getPaymentInfo(Number(playerId)),
      getSessionTotals(Number(playerId)),
      getPaymentSummary(Number(playerId)),
    ]);

    const [
      { currencyId, balance, bonusBalance },
      { depositCount, withdrawalCount, totalDepositAmount, totalWithdrawalAmount },
      { bonusBet, bonusWin, realBet, realWin },
      { depositCountInSixMonths, depositAmountInSixMonths, withdrawalCountInSixMonths, withdrawalAmountInSixMonths, creditedBonusMoney, bonusToReal, freespins, compensations },
    ] = x;

    logger.debug('getFinancialInfo', {
      freespins,
      compensations,
      creditedBonusMoney,
      totalDepositAmount,
      bonusToDepositRatio: totalDepositAmount > 0 ? (freespins + compensations + creditedBonusMoney) / totalDepositAmount : 0
    });

    const totalBetAmount = realBet + bonusBet;
    const totalWinAmount = realWin + bonusWin;
    return res.status(200).json({
      balance: formatMoney(balance, currencyId),
      bonusBalance: formatMoney(bonusBalance, currencyId),
      totalBalance: formatMoney(balance + bonusBalance, currencyId),
      totalBetAmount: formatMoney(totalBetAmount, currencyId),
      totalWinAmount: formatMoney(totalWinAmount, currencyId),
      rtp: totalBetAmount > 0 ? Number(100 * totalWinAmount / totalBetAmount).toFixed(2) : '-',  
      depositCount,
      withdrawalCount,
      totalDepositAmount: formatMoney(totalDepositAmount, currencyId),
      totalWithdrawalAmount: formatMoney(totalWithdrawalAmount, currencyId),
      depositCountInSixMonths,
      depositAmountInSixMonths: formatMoney(depositAmountInSixMonths, currencyId),
      withdrawalCountInSixMonths,
      withdrawalAmountInSixMonths: formatMoney(withdrawalAmountInSixMonths, currencyId),
      creditedBonusMoney: formatMoney(creditedBonusMoney, currencyId),
      bonusToReal: formatMoney(bonusToReal, currencyId),
      freespins: formatMoney(freespins, currencyId),
      compensations: formatMoney(compensations, currencyId),
      bonusToDepositRatio: totalDepositAmount > 0 ? (freespins + compensations + creditedBonusMoney) / totalDepositAmount : 0,
      depositsMinusWithdrawals: formatMoney(totalDepositAmount - totalWithdrawalAmount, currencyId),
      depositsMinusWithdrawalsInSixMonths: formatMoney(depositAmountInSixMonths - withdrawalAmountInSixMonths, currencyId),
    });
  } catch (err) {
    logger.error('Get financial info failed');
    return next(Boom.badRequest(err.message));
  }
};

const getRegistrationInfo = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const registrationInfo = await Player.getRegistrationInfo(Number(playerId));
    if (registrationInfo == null) {
      return res.status(404).json({ error: 'Not found' });
    }
    const registrationIP = await formatIp(registrationInfo.ipAddress);
    const registrationTime = moment(registrationInfo.createdAt).format('DD.MM.YYYY HH:mm:ss');
    const lastLogin = registrationInfo.lastLogin && moment(registrationInfo.lastLogin).format('DD.MM.YYYY HH:mm:ss');
    return res.status(200).json({ ...registrationInfo, registrationIP, registrationTime, lastLogin });
  } catch (err) {
    logger.warn('Get registration info failed');
    return next(err);
  }
};

const getAccountStatus = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const accountStatus = await Player.getAccountStatus(Number(req.params.playerId));
    const { flagged, locked, verified } = await Player.getRequireDueDiligenceFlags(Number(req.params.playerId));
    const { potentialGamblingProblem } = await Player.getRiskFlags(Number(req.params.playerId));
    return res.status(200).json({ ddPending: flagged && !verified, ddMissing: locked, potentialGamblingProblem, ...accountStatus });
  } catch (err) {
    logger.warn('get Account status failed');
    return next(err);
  }
};

const updateAccountStatus = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const playerId = Number(req.params.playerId);
  try {
    const accountStatusDraft = await validate(req.body, updateAccountStatusSchema, 'Update account status failed');
    await Player.updateAccountStatus(playerId, accountStatusDraft, req.userSession.id);
    const accountStatus = await Player.getAccountStatus(playerId);
    const { flagged, locked } = await Player.getRequireDueDiligenceFlags(Number(req.params.playerId));
    return res.status(200).json({ ddPending: flagged, ddMissing: locked, ...accountStatus });
  } catch (err) {
    if (err.constraint && (err.constraint === 'players_brandId_email_key' || err.constraint === 'players_brandId_mobilePhone_key')) {
      logger.warn('Update account status failed', err);
      const accountStatus = await Player.getAccountStatus(playerId);
      return res.status(400).json(accountStatus);
    }
    logger.warn('Update account status failed');
    return next(err);
  }
};

const getStatusHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const update = await Player.currentStatus(Number(playerId));
    return res.status(200).json({ update });
  } catch (err) {
    logger.warn('Get status failed');
    return next(err);
  }
};

const getEvents = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const events = await PlayerEvent.queryPlayerEvents(Number(playerId));

    return res.status(200).json(events);
  } catch (err) {
    logger.warn('Get events failed');
    return next(err);
  }
};

const getNotes = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const notes = await PlayerEvent.queryPlayerEvents(Number(playerId), ['note']);
    return res.status(200).json(notes);
  } catch (err) {
    logger.warn('Get notes failed');
    return next(err);
  }
};

const addNote = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const { id: userId } = req.userSession;

    const { content } = await validate(req.body, addEventSchema, 'Add failed');

    const [event] = await PlayerEvent.addNote(Number(playerId), userId, content).returning('*');
    return res.status(200).json(event);
  } catch (err) {
    logger.warn('Add event failed');
    return next(err);
  }
};

const addTag = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const tagDraft = await validate(req.body, tagSchema, 'Add tag failed');
    await Player.addTag(Number(playerId), tagDraft.tag);
    const tags = await Player.getTags(Number(playerId));
    return res.status(200).json(keys(tags));
  } catch (err) {
    logger.warn('Add tag failed');
    return next(err);
  }
};

const removeTag = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId, tag } = req.params;
    await Player.removeTag(Number(playerId), tag);
    const tags = await Player.getTags(Number(playerId));
    return res.status(200).json(keys(tags));
  } catch (err) {
    logger.warn('Remove tag failed');
    return next(err);
  }
};

const getTags = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const tags = await Player.getTags(Number(playerId));
    return res.status(200).json(keys(tags));
  } catch (err) {
    logger.warn('Get tags failed');
    return next(err);
  }
};

const usernameToIdMappingHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brandId, username }: { brandId: BrandId, username: string } = (req.params: any);
    const player = await Player.findByUsername(brandId, username);
    if (player != null) {
      return res.redirect(`/players/@${player.id}/player-info`);
    }
    logger.debug('Username mapping not found', req.params);
    return next();
  } catch (e) {
    logger.warn('Username to id mapping failed', req.params);
    return next(e);
  }
};

const suspendPlayerHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { note, accountClosed, reasons } = await validate(req.body, suspendPlayerSchema, 'Player suspend failed');
    const playerId = Number(req.params.playerId);
    const payments = await Payments.statement(playerId);
    const { balance } = await Player.currentStatus(playerId);

    if (includes('data_removal', reasons) && payments.length > 0) {
      throw Boom.badRequest(errorCodes.REAL_TRANSACTIONS.message, errorCodes.REAL_TRANSACTIONS);
    }

    if (balance.totalBalance > 0) {
      throw Boom.badRequest(errorCodes.REMAINING_BALANCE.message, errorCodes.REMAINING_BALANCE);
    }
    await Player.suspendAccount(playerId, accountClosed, reasons, note, req.userSession.id);
    return res.status(200).json({});
  } catch (err) {
    logger.warn('Suspend player failed');
    return next(err);
  }
};

const getPlayersWithClosedAccountsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const players = await pg.transaction(tx => Player.getPlayerFromOtherBrands(tx, playerId));
    return res.status(200).json(players);
  } catch (err) {
    logger.warn('Get players with closed accounts failed');
    return next(err);
  }
};

const archiveNoteHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { noteId, playerId } = req.params;
    await PlayerEvent.archiveNote(Number(noteId), Number(playerId));
    return res.status(200).json({});
  } catch (err) {
    logger.warn('Archive note failed');
    return next(err);
  }
};

const getPlayerStickyNote = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const stickyNote = await Player.getStickyNote(playerId);
    return res.status(200).json({ content: stickyNote });
  } catch (err) {
    logger.warn('Get sticky note failed');
    return next(err);
  }
};

const setPlayerStickyNote = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const { id: userId } = req.userSession;
    const { content } = await validate(req.body, updateStickyNoteSchema, 'Update sticky note failed');

    const [note] = await PlayerEvent.addNote(playerId, userId, content).returning('*');
    await Player.setStickyNote(playerId, note.id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.warn('Update sticky note failed');
    return next(err);
  }
};

const registerPlayerWithGamblingProblemHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { id: userId } = req.userSession;
    const { player, note } = await validate(req.body, registerPlayerWithGamblingProblemSchema, 'Register player with gambling problem schema validation failed');

    const extraData = {
      brandId: 'LD',
      languageId: 'en',
      currencyId: 'EUR',
      ipAddress: '127.0.0.1',
      password: 'dummy_password',
      allowGameplay: false,
      allowTransactions: false,
      accountSuspended: true,
      gamblingProblem: true,
    };

    const mobilePhone = player.mobilePhone && player.mobilePhone !== '000' ? parse(player.mobilePhone, player.countryId) : player.mobilePhone;
    const playerResult = await Player.create({ ...player, ...extraData, mobilePhone });
    await PlayerEvent.addEvent(playerResult.id, userId, 'account', 'accountSuspended.true', { reason: 'registered with a gambling problem', note });
    if (note) {
      await PlayerEvent.addNote(playerResult.id, userId, note);
    }
    await setupAccount(playerResult.id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err.constraint) {
      if (err.constraint === 'players_brandId_email_key') {
        return next(Boom.badRequest(errorCodes.DUPLICATE_EMAIL.message));
      }
      if (err.constraint === 'players_brandId_mobilePhone_key') {
        return next(Boom.badRequest(errorCodes.PHONE_ALREADY_EXISTS.message));
      }
    }

    logger.error('Register player with gambling problem failed', err);
    return next(err);
  }
};

module.exports = {
  getPlayer,
  getPlayers,
  updatePlayer,
  searchPlayer,
  getFinancialInfo,
  getRegistrationInfo,
  getAccountStatus,
  updateAccountStatus,
  suspendPlayerHandler,
  getEvents,
  getNotes,
  addNote,
  getStatusHandler,
  addTag,
  removeTag,
  getTags,
  usernameToIdMappingHandler,
  getPlayersWithClosedAccountsHandler,
  archiveNoteHandler,
  getPlayerStickyNote,
  setPlayerStickyNote,
  registerPlayerWithGamblingProblemHandler,
};
