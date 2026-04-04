/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const Bonus = require('./Bonus');
const Player = require('../players/Player');
const { formatMoney } = require('../core/money');
const { bonusSchema, bonusLimitsSchema, playerBonusSchema } = require('./schemas');

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const getBonuses = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const bonuses = await Bonus.getBonuses(playerId);
    const { currencyId } = await Player.getBalance(playerId);
    const result = bonuses.map(bonus => ({
      bonus: bonus.name,
      status: bonus.status,
      formattedStatus: (
        bonus.status === 'active'
          ? `Active${(bonus.expiryDate != null ? ', expires ' + moment(bonus.expiryDate).format('DD.MM.YYYY') : '')}` // eslint-disable-line prefer-template
          : capitalize(bonus.status)
          + (bonus.completedAt != null ? ` at ${moment(bonus.completedAt).format('DD.MM.YYYY HH:mm:ss')}` : ''))
          + (bonus.forfeitedBy != null ? ` by ${bonus.forfeitedBy}` : ''),
      created: moment(bonus.createdAt).format('DD.MM.YYYY HH:mm:ss') + (bonus.createdBy != null ? ` by ${bonus.createdBy}` : ''),
      amount: formatMoney(bonus.initialBalance, currencyId),
      wagering: `${formatMoney(bonus.wagered, currencyId)}/${formatMoney(bonus.wageringRequirement, currencyId)}`,
      balance: formatMoney(bonus.balance, currencyId),
      id: bonus.id,
      creditedBy: bonus.creditedBy,
      archived: bonus.archived,
    }));
    return res.status(200).json(result);
  } catch (err) {
    logger.warn('Get bonuses failed');
    return next(err);
  }
};

const getAvailableBonuses = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const bonuses = await Bonus.getAvailableBonuses(Number(req.params.playerId));
    logger.debug('getAvailableBonuses', req.params.playerId, bonuses);
    const result = bonuses.map(bonus => ({
      id: bonus.name,
      title: bonus.name + (bonus.wageringRequirementMultiplier > 0 ? ` (${bonus.wageringRequirementMultiplier}x wagering)` : ''),
    }));
    return res.status(200).json(result);
  } catch (err) {
    logger.warn('Get available bonuses failed');
    return next(err);
  }
};

const getAvailableBonusesByBrand = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const bonuses = await Bonus.getAvailableBonusesByBrand(brandId);
    return res.status(200).json(bonuses);
  } catch (err) {
    logger.warn('Get available bonuses by brand failed');
    return next(err);
  }
};

const updateBonus = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const bonusId = Number(req.params.bonusId);
    const bonusDraft = await validate(req.body, bonusSchema, 'Update bonus failed');

    const bonus = await Bonus.updateBonus(bonusId, bonusDraft);
    return res.status(200).json(bonus);
  } catch (err) {
    logger.warn('Update bonus failed');

    return next(err);
  }
};

const createBonus = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const bonusDraft = await validate(req.body, bonusSchema, 'Create bonus failed');
    const bonus = await Bonus.createBonus(bonusDraft);
    return res.status(200).json(bonus);
  } catch (err) {
    logger.warn('Create bonus failed');
    return next(err);
  }
};

const getBonusLimits = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const bonusId = Number(req.params.bonusId);
    const bonus = await Bonus.getBonus(bonusId);
    const limits = await Bonus.getBonusLimits(bonusId, bonus.brandId);
    return res.status(200).json(limits);
  } catch (err) {
    logger.warn('Get bonus limits');
    return next(err);
  }
};

const getAvailableBonusLimits = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const currencies = await Bonus.getBrandCurrencies(brandId);
    return res.status(200).json(currencies.map(currency => ({ currencyId: currency })));
  } catch (err) {
    logger.warn('Get available bonus limits failed');
    return next(err);
  }
};

const updateBonusLimits = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const bonusLimitDrafts = await validate(req.body, bonusLimitsSchema, 'Update bonus limits failed');
    const bonusId = Number(req.params.bonusId);
    const bonusLimits = await Promise.all(
      bonusLimitDrafts
        .filter(({ minAmount, maxAmount }) => minAmount && maxAmount)
        .map(({ currencyId, minAmount, maxAmount }) => Bonus.upsertBonusLimit(bonusId, currencyId, minAmount, maxAmount)),
    );

    return res.status(200).json(bonusLimits);
  } catch (err) {
    logger.warn('Update bonus limits failed');

    return next(err);
  }
};

const creditBonus = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const bonusDraft = await validate(req.body, playerBonusSchema, 'Credit bonus failed');
    await Bonus.creditManualBonus(Number(req.params.playerId), bonusDraft.id, bonusDraft.amount, bonusDraft.expiryDate, req.userSession.id);
    const update = await Player.currentStatus(Number(req.params.playerId));
    return res.status(200).json({ update });
  } catch (err) {
    logger.warn('Credit bonus failed');
    return next(err);
  }
};

const forfeitBonus = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const {
      params: { playerId, bonusId },
      userSession: { id: userId },
    } = req;

    await pg.transaction(tx => Bonus.forfeitBonus(tx, Number(playerId), Number(bonusId), userId));
    const update = await Player.currentStatus(Number(req.params.playerId));
    return res.status(200).json({ update });
  } catch (err) {
    logger.warn('Forfeit bonus failed');
    return next(err);
  }
};

const archiveBonus = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { bonusId } = req.params;
    await Bonus.archiveBonus(Number(bonusId));
    return res.status(200).json(true);
  } catch (err) {
    logger.warn('Archive bonus failed');
    return next(err);
  }
};

module.exports = {
  getBonuses,
  getAvailableBonuses,
  getAvailableBonusesByBrand,
  updateBonus,
  createBonus,
  getBonusLimits,
  getAvailableBonusLimits,
  updateBonusLimits,
  creditBonus,
  forfeitBonus,
  archiveBonus,
};
