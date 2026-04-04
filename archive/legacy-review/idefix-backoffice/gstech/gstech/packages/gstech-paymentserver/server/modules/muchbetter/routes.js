
/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { Deposit, Withdrawal } from 'gstech-core/modules/types/backend';

const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const { brandDefinitions } = require('gstech-core/modules/constants');
const MuchBetter = require('./MuchBetter');

const getAccountInfo = (body: any, player: PlayerWithDetails) => {
  const { optionalParams } = body;
  let accountHolder;
  let fraudCheckOk = true;
  if (optionalParams) {
    const { countryISOMatched, dobYYYYMMDDMatched, lastNameRawLevenshteinDistance } = optionalParams;
    if (countryISOMatched != null) {
      fraudCheckOk = fraudCheckOk && (countryISOMatched === 'true');
    }
    if (dobYYYYMMDDMatched != null) {
      fraudCheckOk = fraudCheckOk && (dobYYYYMMDDMatched === 'true');
    }
    if (lastNameRawLevenshteinDistance != null) {
      const distance = Number(lastNameRawLevenshteinDistance);
      fraudCheckOk = fraudCheckOk && (distance < 4);
    }
    if (fraudCheckOk) {
      accountHolder = `${player.firstName} ${player.lastName}`;
    }
  }
  return { accountHolder, fraudCheckOk };
};

const processDeposit = async (body: any, player: PlayerWithDetails, deposit: Deposit, accountHolder?: string) => {
  const data = {
    amount: money.parseMoney(body.amount),
    accountHolder,
    externalTransactionId: `${body.transactionId}`,
    account: player.mobilePhone,
    accountParameters: {
      id: body.transactionId,
    },
    message: body.transactionReference,
    rawTransaction: body,
  };
  await client.processDepositAlt(body.merchantInternalRef, data);
};

const cancelDeposit = async (body: any) => {
  const data = {
    message: body.transactionReference,
    rawTransaction: body,
  };
  await client.setDepositStatusAlt(body.merchantInternalRef, 'cancelled', data);
};

const completeWithdrawal = async (body: any, player: PlayerWithDetails, withdrawal: Withdrawal) => {
  logger.debug('muchbetter completeWithdrawal', body);
  const brandInfo = brandDefinitions[player.brandId];
  const transactionReference = `${brandInfo.name} Withdrawal: ${withdrawal.paymentId}`;
  const account = await client.getAccount(withdrawal.username, withdrawal.accountId);
  const response = await MuchBetter.withdrawalRequest(player, withdrawal.amount, account.account, withdrawal.transactionKey, transactionReference);
  const { status, transactionId } = response;

  const complete = {
    externalTransactionId: String(transactionId),
    message: status,
    rawTransaction: response,
  };
  logger.debug('muchbetter withdrawalRequest', complete, response);
  const wdStatus = (status === 'COMPLETED' || status === 'PENDING') ? 'complete' : 'cancelled';
  await client.setWithdrawalStatus(player.username, withdrawal.transactionKey, wdStatus, complete);

  await client.updateAccountParameters(player.username, withdrawal.accountId, { parameters: {
    id: withdrawal.paymentId,
  } });
};

const cancelWithdrawal = async (body: any, player: PlayerWithDetails, withdrawal: Withdrawal, message: string = body.status) => {
  const cancel = {
    externalTransactionId: `${body.transactionId}`,
    message,
    rawTransaction: body,
  };
  await client.setWithdrawalStatus(player.username, withdrawal.transactionKey, 'failed', cancel);
};

const processHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { body } = req;
    logger.debug('MuchBetter callback', body);

    if (money.parseMoney(body.amount)) { // normal deposit callback
      const { deposit } = await client.getDepositAlt(body.merchantInternalRef);
      const player = await client.details(deposit.username);
      const { accountHolder } = getAccountInfo(body, player);

      if (body.transactionType === 'REQUEST_FUNDS' && body.status === 'COMPLETED') await processDeposit(body, player, deposit, accountHolder);
      if (body.transactionType === 'REQUEST_FUNDS' && body.status === 'REJECTED') await cancelDeposit(body);
    } else { // 0 auth deposit callback
      const transactionKey = body.merchantInternalRef.replace('wd-auth:', '');
      const { withdrawal } = await client.getWithdrawalDetails(transactionKey);
      const player = await client.details(withdrawal.username);
      const { fraudCheckOk } = getAccountInfo(body, player);

      if (fraudCheckOk) {
        if (body.transactionType === 'REQUEST_FUNDS' && body.status === 'COMPLETED') await completeWithdrawal(body, player, withdrawal);
        if (body.transactionType === 'REQUEST_FUNDS' && body.status === 'REJECTED') await cancelWithdrawal(body, player, withdrawal);
      } else {
        await cancelWithdrawal(body, player, withdrawal, 'Player verification failed');
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    logger.error('MuchBetter callback failed', e);
    return res.status(500).json({ ok: false });
  }
};

module.exports = { processHandler };
