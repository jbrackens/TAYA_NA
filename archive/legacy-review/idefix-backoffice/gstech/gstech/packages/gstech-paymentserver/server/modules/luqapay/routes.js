
/* @flow */
const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const { parseMoney } = require('gstech-core/modules/money');
const Luqapay = require('./Luqapay');

const processHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { body, query } = req;
    logger.debug('Luqapay process callback', { body, query });

    const userAgent = req.get('user-agent') || 'No user agent';
    const { transactionKey } = query;
    const { amount: amountInfo, swiftCode, ok, failure } = body;
    if (!amountInfo) {
      return res.redirect(req.body.failure);
    }
    const [activeAmountId, amount] = amountInfo.split('_');
    const ipAddress = (req.connection?.remoteAddress || '').replace('::ffff:', '');

    const { deposit } = await client.getDepositAlt(transactionKey);
    const player = await client.details(deposit.username);

    const redirectUrl = await Luqapay.initializeDeposit(player, amount, transactionKey, activeAmountId, ipAddress, userAgent, swiftCode, ok, failure);

    return res.redirect(redirectUrl);
  } catch (e) {
    logger.error('Luqapay process callback failed', e);
    return res.redirect(req.body.failure);
  }
};

const successProcessHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { body, query } = req;
    logger.debug('Luqapay success callback', { body, query });

    const { transactionId, referenceNo: transactionKey, amount, message, status, paymentMethod } = body;

    if (paymentMethod === 'COMMUNITY_BANK') { // deposit callback
      const { deposit } = await client.getDepositAlt(transactionKey);
      const player = await client.details(deposit.username);

      if (status === 'APPROVED') {
        const data = {
          accountHolder: `${player.firstName} ${player.lastName}`,
          amount: parseMoney(amount),
          externalTransactionId: transactionId,
          message,
          rawTransaction: body,
        };
        await client.processDepositAlt(transactionKey, data);
      }

      if (status === 'DECLINED') {
        const data = {
          message,
          rawTransaction: body,
        };
        await client.setDepositStatusAlt(transactionKey, 'cancelled', data);
      }
    }

    if (paymentMethod === 'BTP_WITHDRAW') { // wd callback
      const { withdrawal } = await client.getWithdrawalDetails(transactionKey);
      const player = await client.details(withdrawal.username);

      if (status === 'APPROVED') {

        const complete = {
          externalTransactionId: transactionId,
          message,
          rawTransaction: body,
        };

        await client.setWithdrawalStatus(player.username, transactionKey, 'complete', complete);
      }

      if (status === 'DECLINED') {
        const cancel = {
          externalTransactionId: transactionId,
          message,
          rawTransaction: body,
        };
        await client.setWithdrawalStatus(player.username, transactionKey, 'failed', cancel);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    logger.error('Luqapay success callback failed', e);
    return res.status(500).json({ ok: false });
  }
};


module.exports = { processHandler, successProcessHandler };
