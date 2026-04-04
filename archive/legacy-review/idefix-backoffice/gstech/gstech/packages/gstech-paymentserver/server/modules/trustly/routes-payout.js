/* @flow */
import type { Trustly, TrustlyMode, CreditRequest } from './types';

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-payment-api');
const config = require('../../../config');

const trustlies = require('./trustly');

const testResult = (method: any) => ({
  result: {
    signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
    uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
    method,
    data: { status: 'OK' },
  },
  version: '1.1',
});

const failed = async (request: Trustly<CreditRequest>) => {
  const { data } = request.params;
  const withdrawalStatusRequest = {
    externalTransactionId: data.orderid,
    message: 'Transaction Failed',
    rawTransaction: request,
  };
  await api.setWithdrawalStatus(data.enduserid, data.messageid, 'failed', withdrawalStatusRequest);
};

const processHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { body } = req;
    const mode: TrustlyMode = (req.params.mode: any);
    const trustly = trustlies[mode];

    switch (body.method) {
      case 'credit':
        await failed(body);
        break;
      case 'cancel':
        await failed(body);
        break;
      default:
        throw new Error(`Method '${body.method}' is not supported`);
    }

    if (config.isTest) {
      return res.json(testResult(body.method));
    }

    const result = await trustly.createNotificationResponse(body);
    return res.send(result);
  } catch (e) {
    logger.error('Trustly withdrawal notification failed:', e);
    return res.status(500).json({ error: { message: e.message } });
  }
};

module.exports = { processHandler };
