
/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { JetonIPNRequest, JetonCustomerRequest, JetonCustomerResponse } from './types';

const { axios } = require('gstech-core/modules/axios');

const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const config = require('../../../config');

const configuration = config.providers.jeton;

const processDeposit = async (body: JetonIPNRequest, player: PlayerWithDetails) => {
  const { apiKey } = configuration.brands[player.brandId];
  const { endpoint } = configuration;
  const options: JetonCustomerRequest = {
    json: true,
    method: 'POST',
    url: `${endpoint}/api/v3/integration/merchants/customers`,
    headers: { 'X-API-KEY': apiKey },
    body: {
      customer: body.customer,
    },
  };

  logger.debug('jeton customers request:', { options });
  const { data: response } = await axios.post<
    $PropertyType<JetonCustomerRequest, 'body'>,
    JetonCustomerResponse,
  >(`${endpoint}/api/v3/integration/merchants/customers`, options.body, {
    headers: { 'X-API-KEY': apiKey },
  });
  logger.debug('jeton customers response:', { response });

  const accountHolder = response && `${response.firstName} ${response.lastName}`;
  const data = {
    amount: money.parseMoney(body.amount),
    externalTransactionId: `${body.paymentId}`,
    account: body.customer,
    accountHolder,
    message: body.message,
    rawTransaction: body,
  };
  await client.processDepositAlt(body.orderId, data);
};

const cancelDeposit = async (body: JetonIPNRequest) => {
  const data = {
    message: body.message,
    rawTransaction: body,
  };
  await client.setDepositStatusAlt(body.orderId, 'cancelled', data);
};

const completeWithdrawal = async (body: JetonIPNRequest, player: PlayerWithDetails) => {
  logger.debug('jeton completeWithdrawal', body);

  const complete = {
    externalTransactionId: `${body.paymentId}`,
    message: body.message,
    rawTransaction: body,
  };

  logger.debug('jeton withdrawalRequest', complete);
  await client.setWithdrawalStatus(player.username, body.orderId, 'complete', complete);
};

const cancelWithdrawal = async (body: JetonIPNRequest, player: PlayerWithDetails) => {
  const cancel = {
    externalTransactionId: `${body.paymentId}`,
    message: body.message,
    rawTransaction: body,
  };
  await client.setWithdrawalStatus(player.username, body.orderId, 'failed', cancel);
};

const processHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    // $FlowFixMe[class-object-subtyping]
    const { body }: { body: JetonIPNRequest, ... } = req;
    logger.debug('Jeton IPN callback', body);

    if (body.type === 'PAY') {
      if (body.status === 'SUCCESS') {
        const { deposit } = await client.getDepositAlt(body.orderId);
        const player = await client.details(deposit.username);

        await processDeposit(body, player);
      } else {
        await cancelDeposit(body);
      }

    } else if (body.type === 'PAYOUT') {
      const { withdrawal } = await client.getWithdrawalDetails(body.orderId);
      const player = await client.details(withdrawal.username);

      if (body.status === 'SUCCESS') {
        await completeWithdrawal(body, player);
      } else {
        await cancelWithdrawal(body, player);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    logger.error('Jeton IPN callback failed', e);
    return res.status(500).json({ ok: false });
  }
};

module.exports = { processHandler };
