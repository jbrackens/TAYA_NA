
/* @flow */
const crypto = require('crypto');

const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const configuration = config.providers.neosurf;

const processDeposit = async (body: any) => {
  const data = {
    amount: body.amount,
    externalTransactionId: body.transactionId,
    message: body.status,
    rawTransaction: body,
  };
  await client.processDepositAlt(body.merchantTransactionId, data);
};

const cancelDeposit = async (body: any) => {
  const data = {
    message: body.message,
    rawTransaction: body,
  };
  await client.setDepositStatusAlt(body.orderId, 'cancelled', data);
};

const processHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { body } = req;
    logger.debug('Neosurf callback', body);

    const { hash: mayBeHash, ...parameters } = body;

    const data = Object.values(parameters).map(v => v).join('') + configuration.secret;
    const hash = crypto.createHash('sha512').update(data).digest('hex');

    if (hash !== mayBeHash) {
      logger.error('Neosurf callback auth failed', body);
      return res.status(401).json({ ok: false });
    }

    if (body.status === 'ok') {
      await processDeposit(body);
    } else {
      await cancelDeposit(body);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    logger.error('Neosurf callback failed', e);
    return res.status(500).json({ ok: false });
  }
};

module.exports = { processHandler };
