
/* @flow */
import type { ProcessDepositWithoutAmountRequest } from 'gstech-core/modules/clients/backend-payment-api';
import type { EmpRequest } from './types';

const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');

const processHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const body: EmpRequest = (req.body: any);
    logger.debug('EMP callback API call', body);

    if (body.Status === 'captured') {
      const data: ProcessDepositWithoutAmountRequest = {
        withoutAmount: true,
        account: '',
        accountHolder: undefined,
        externalTransactionId: body.Reference,
        accountParameters: {},
        message: body.Message,
        rawTransaction: body,
      };
      await client.processDeposit(body.UserId, body.Tid, data);
      return res.json({ ok: true });
    }
    return res.json({ ok: false });
  } catch (e) {
    logger.error('EMP callback API call failed', e);
    return res.json({ ok: false });
  }
};

module.exports = { processHandler };
