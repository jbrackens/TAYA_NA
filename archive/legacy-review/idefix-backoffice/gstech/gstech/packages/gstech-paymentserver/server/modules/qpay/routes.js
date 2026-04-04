/* @flow */
const backend = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const { decrypt } = require('./crypto');

const handler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('QPay deposit callback: ', req.body, req.params);

    const { payload } = req.params;

    const raw = decrypt(decodeURIComponent(payload));
    logger.debug('QPay deposit callback raw message: ', raw);

    const [transactionKey] = raw.split('|');
    const { deposit } = await backend.getDepositAlt(transactionKey);
    const { ok, failure } = (deposit.parameters: any);

    const processDeposit = {
      withoutAmount: true,
      externalTransactionId: transactionKey,
      message: 'QPay success redirect',
      rawTransaction: { raw },
      status: 'complete',
    };

    try {
      await backend.processDeposit(deposit.username, transactionKey, processDeposit);
      return res.redirect(ok);
    } catch (e) {
      return res.redirect(failure);
    }
  } catch (e) {
    logger.error('QPay deposit callback failed', req.body, e);
    return res.status(500).json({ ok: false });
  }
};

module.exports = {
  handler,
};
