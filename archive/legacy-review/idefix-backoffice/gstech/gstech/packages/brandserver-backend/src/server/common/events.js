/* @flow */
import type { CMoney } from 'gstech-core/modules/money-class';
import type { Player, DepositDetails, Deposit } from './api';

const configuration = require('./configuration');
const logger = require('./logger');
const { moneyFrom } = require('./money');

const responders = configuration.requireProjectFile('responders');
const clientCallback = require('./client-callback');

const register = async (req: express$Request, user: Player): Promise<void> => {
  await responders.register(user, req);
};

const deposit = async (req: express$Request, amount: CMoney, fee: CMoney, transactionKey: string, tags: string[], campaignIds: string[], index: number) => {
  const depositDetails: DepositDetails = {
    amountValue: amount.asFixed(),
    tags,
    campaignIds,
    index,
  };

  logger.debug('Adding depositDetails', depositDetails);

  await responders.deposit(req.user, req, amount, depositDetails.tags, depositDetails);
};

const processDeposit = async (req: express$Request, d: Deposit) => {
  const amount = moneyFrom(d.amount, req.context.currencyISO);
  const fee = moneyFrom(d.paymentFee || 0, req.context.currencyISO);
  const tags = (d.parameters && d.parameters.tags) || [];
  const campaignIds = (d.parameters.campaignIds && d.parameters.campaignIds) || [];
  const amountWithoutFee = amount.subtract(fee);
  logger.debug('processDeposit!', d, { amount, fee, amountWithoutFee, tags, campaignIds });
  await deposit(req, amountWithoutFee, fee, d.transactionKey, tags, campaignIds, d.index);
};

const startGame = (req: express$Request, gameID: string): Promise<void> => clientCallback.pushEvent(req, { event: 'game-start', game: req.params.id || gameID });
const startGameForFun = (req: express$Request, gameID: string): Promise<void> => clientCallback.pushEvent(req, { event: 'game-start-free', game: req.params.id || gameID });

module.exports = { register, startGame, startGameForFun, processDeposit };
