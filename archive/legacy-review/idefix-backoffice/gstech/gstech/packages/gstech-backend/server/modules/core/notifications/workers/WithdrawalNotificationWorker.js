/* @flow */

import type { WithdrawRequest, WithdrawResponse } from 'gstech-core/modules/clients/paymentserver-api-types';
import type { Job } from 'gstech-core/modules/queue';

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const Player = require('../../../players');
const config = require('../../../../../config');
const Withdrawal = require('../../../payments/withdrawals/Withdrawal');
const User = require('../../../users');
const { getBrandInfo } = require('../../../settings');

const processResponse = async (op: WithdrawRequest, response: WithdrawResponse): Promise<{ request: any, response: WithdrawResponse }> => {
  logger.debug('Withdrawal complete', response);
  if (response.reject === true) {
    logger.warn('WD rejected', response);
    await Withdrawal.rejectFailedWithdrawal(op.withdrawal.transactionKey, response.message, response.transaction);
  } else if (response.ok === true) {
    const process = await Withdrawal.processWithdrawal(op.withdrawal.transactionKey, response.message, response.transaction, response.parameters);
    logger.debug('WD marked processing', op.withdrawal.transactionKey, { process });
    if (response.id != null && response.complete !== false) {
      const complete = await Withdrawal.markWithdrawalAsComplete(op.withdrawal.transactionKey, response.id, response.message, response.transaction);
      logger.debug('WD marked complete', op.withdrawal.transactionKey, response.id, { complete });
    }
  } else {
    return Promise.reject({ error: 'Withdrawal process failed' });
  }
  return { request: op, response };
};

const processWithdrawal = async (body: WithdrawRequest): Promise<{ request: any, response: WithdrawResponse }>  => {
  try {
    const op = {
      method: 'POST',
      url: `${config.api.paymentServer.private}/withdraw`,
      data: body,
      timeout: 10000,
    };
    logger.debug('Sending notification', op);
    const { data: response } = await axios.request(op);
    return processResponse(body, response);
  } catch (e) {
    if (e.cause && e.cause.code === 'ENOTFOUND') {
      logger.error('ENOTFOUND error from API. Exiting.', e);
      process.exit();
    }
    logger.error('WD Processing failed', body, e);
    throw e;
  }
};

module.exports = async ({ data }: Job<any>): Promise<
    {
      request: any,
      response: any,
    }> => {
  try {
    logger.debug('WithdrawalNotificationWorker', data);
    const player = await Player.getPlayerWithDetails(data.playerId);
    logger.debug('WithdrawalNotificationWorker2', data, player);
    const withdrawal = await Withdrawal.getAcceptedWithdrawal(data.withdrawalId);
    logger.debug('WithdrawalNotificationWorker3', data, withdrawal);
    if (withdrawal.playerId !== player.id) {
      throw new Error(`withdrawal playerId does not match playerId! ${withdrawal.playerId} ${player.id}`);
    }
    const client = await Player.getClientInfo(data.playerId);
    const user = await User.getById(data.userId);
    const brand = await getBrandInfo(player.brandId);

    const body = {
      player,
      withdrawal,
      brand,
      user: { handle: user.handle, name: user.name },
      client,
    };

    logger.debug('Processing withdrawal', data.withdrawalId, withdrawal);

    if (withdrawal == null) {
      logger.warn('Accepted withdrawal not found. State changed? ', data);
      return { request: body, response: { message: 'Already processed' } };
    }
    return processWithdrawal(body);
  } catch (e) {
    logger.error('WithdrawalNotificationWorker failed', data, e);
    throw e;
  }
};
