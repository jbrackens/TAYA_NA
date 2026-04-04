/* @flow */
import type { ConversionRate } from 'gstech-core/modules/types/backend';

const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const campaignServerApi = require('gstech-core/modules/clients/campaignserver-api');
const moment = require('moment-timezone');
const { Money: MoneyClass } = require('gstech-core/modules/money-class');
const { getCurrentRates } = require('../settings/ConversionRates');
const Payment = require('../payments/Payment');
const { addPlayerFraudTx } = require('../frauds');

type InactivePlayerData = {
  playerId: Id,
  brandId: BrandId,
  brand: string,
  name: string,
  email: string,
  currencyId: string,
  languageId: string,
  balance: number,
};

type PlayerFeeDeductionData = {
  playerId: Id,
  deduct: Money,
  message: string,
};

const INACTIVITY_FEE = {
  message: `deduction made in accordance with player inactivity`,
  value: 5.0,
};

const getPlayersByInactivityPeriod = async (
  knex: Knex,
  monthsBack: number | number[],
  inclZeroBalance: boolean = false,
): Promise<InactivePlayerData[]> =>
  knex('players')
    .select({
      playerId: 'players.id',
      brandId: 'players.brandId',
      brand: 'brands.name',
      name: pg.raw(`players."firstName" || ' ' || players."lastName"`),
      email: 'players.email',
      currencyId: 'players.currencyId',
      languageId: 'players.languageId',
      balance: 'players.balance',
    })
    .innerJoin('brands', 'brands.id', 'players.brandId')
    .where({ 'players.accountClosed': false, 'players.accountSuspended': false })
    .where((qb) => (!inclZeroBalance ? qb.where('players.balance', '>', 0) : qb))
    .whereRaw(
      `players."lastLogin"::DATE in (
          ${_.castArray(monthsBack)
            .map((m) => `CURRENT_DATE - INTERVAL '${m} months'`)
            .join(', ')}
        )`,
    )
    .whereNotExists(
      knex
        .select('player_limits.id')
        .from('player_limits')
        .where({ 'player_limits.active': true, 'player_limits.type': 'exclusion' })
        .whereRaw('player_limits."playerId" = "players".id')
        .whereRaw('(expires > now() or (expires is null and permanent = true))'),
    );

const handleWithWarningMail = async (mailerId: string, playerList: InactivePlayerData[]) => {
  for (const playerContext of playerList) {
    const { email, name, currencyId, brandId, brand, languageId } = playerContext;
    const { ok } = await campaignServerApi.sendEmailDirectly({
      email,
      currencyId,
      languageId,
      brandId,
      mailerId,
      firstName: name,
      values: { name, brand },
    });
    if (!ok) logger.error(`XXX handleWithWarningMail`, { playerContext, mailerId });
  }
};

const mapToFeeContext = (
  { balance, currencyId, playerId }: InactivePlayerData,
  rates: ConversionRate[],
): PlayerFeeDeductionData => {
  const asCurrency = (amount: number, to: ConversionRate['currencyId']) =>
    amount * (rates.find((r) => r.currencyId === to)?.conversionRate || 0);
  const deductInCurrency = _.ceil(asCurrency(INACTIVITY_FEE.value, currencyId) * 100);
  const valueToDeduct = deductInCurrency > balance ? balance : deductInCurrency;
  const deductAsMoney = new MoneyClass(valueToDeduct, currencyId);
  return {
    playerId,
    deduct: valueToDeduct,
    message: `${deductAsMoney.asFloat()}${currencyId} ${INACTIVITY_FEE.message}`,
  };
};

const handleWithFeeDeduction = async (playerList: InactivePlayerData[]) => {
  const currentRates = await getCurrentRates();
  const playersFee = playerList.map((player) => mapToFeeContext(player, currentRates));
  await pg.transaction(async (tx) => {
    for (const { playerId, deduct, message } of playersFee)
      await Payment.addTransaction(playerId, null, 'correction', -deduct, message, null, tx);
  });
};

const handleWithAccountClosure = async (playerList: InactivePlayerData[]) => {
  await pg.transaction(async (tx) => {
    for (const { playerId } of playerList)
      await addPlayerFraudTx(playerId, '18mo_inactive', moment().format('YYYYMM'), {}, tx);
  });
};

const notifyInactivePlayers = async () => {
  try {
    const notify12Players = await getPlayersByInactivityPeriod(pg, 11);
    logger.debug('+++ notifyInactivePlayers:12', { ids: _.map(notify12Players, 'playerId') });
    if (notify12Players.length) await handleWithWarningMail('inactivity12', notify12Players);

    const notify18Players = await getPlayersByInactivityPeriod(pg, 17);
    logger.debug('+++ notifyInactivePlayers:18', { ids: _.map(notify18Players, 'playerId') });
    if (notify18Players.length) await handleWithWarningMail('inactivity18', notify18Players);
  } catch (error) {
    logger.error('XXX notifyInactivePlayers', { error });
  }
};

const actionInactivePlayers = async () => {
  try {
    const inactiveFeePlayers = await getPlayersByInactivityPeriod(pg, [12, 13, 14, 15, 16, 17]);
    logger.debug(`+++ actionInactivePlayers:12`, { ids: _.map(inactiveFeePlayers, 'playerId') });
    if (inactiveFeePlayers.length) await handleWithFeeDeduction(inactiveFeePlayers);

    const inactive18Players = await getPlayersByInactivityPeriod(pg, 18, true);
    logger.debug(`+++ actionInactivePlayers:18`, { ids: _.map(inactive18Players, 'playerId') });
    if (inactive18Players) await handleWithAccountClosure(inactive18Players);
  } catch (error) {
    logger.error('XXX actionInactivePlayers', { error });
  }
};

module.exports = {
  INACTIVITY_FEE,
  getPlayersByInactivityPeriod,
  notifyInactivePlayers,
  actionInactivePlayers,
};
