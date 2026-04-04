/* @flow */
import type { Trustly, TrustlyMode, AccountRequest, CreditRequest, CancelRequest, DebitRequest, KYCRequest } from './types';

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-payment-api');
const money = require('gstech-core/modules/money');

const config = require('../../../config');
const trustlies = require('./trustly');
const trustlyCustom = require('./trustly-custom');
const { mapPersonId } = require('./utils');

const testResult = (method: any) => ({
  result: {
    signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
    uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
    method,
    data: { status: method === 'kyc' ? 'CONTINUE' : 'OK' },
  },
  version: '1.1',
});

const account = async (request: Trustly<AccountRequest>, brandId: BrandId, mode: TrustlyMode) => {
  const { data } = request.params;
  const depositResponse = await api.getDepositAlt(data.messageid);
  const updateDepositRequest = {
    account: data.attributes.descriptor,
    accountHolder: data.attributes.name,
    externalTransactionId: data.orderid,
    accountParameters: { trustlyAccountId: data.accountid, trustlyMode: mode },
    message: 'Add Account Information',
    rawTransaction: request.params,
  };
  await api.updateDeposit(depositResponse.deposit.username, data.messageid, updateDepositRequest);

  if (data.verified) {
    const { name, personid, address, zipcode, city } = data.attributes;
    if (address != null || personid != null) {
      const type = personid != null ? 'Identification' : 'Proof of address';
      const content = `${type} from Trustly (${personid || 'National ID not available'}):
- Name: ${name}
- Address: ${address}
- Postcode: ${zipcode}
- City: ${city}`;

      const createDocumentRequest = {
        type: personid != null ? 'identification' : 'utility_bill',
        content,
        source: 'Trustly',
        fields: { name, personid, address, zipcode, city },
      };
      await api.addDocument(depositResponse.deposit.username, createDocumentRequest);
    }
  }
};

const credit = async (request: Trustly<CreditRequest>, noAccount: boolean, status: 'pending' | 'complete' | 'settled' = 'complete') => {
  const { data } = request.params;
  const processDepositRequest = {
    amount: money.parseMoney(data.amount),
    externalTransactionId: data.orderid,
    account: noAccount ? '' : undefined,
    accountHolder: noAccount ? null : undefined,
    accountParameters: { },
    message: 'Deposit',
    status,
    rawTransaction: request.params,
  };
  await api.processDepositAlt(data.messageid, processDepositRequest);
};

const debit = async (request: Trustly<DebitRequest>) => {
  const { data } = request.params;
  const depositStatusRequest = {
    message: 'Deposit Failed',
    rawTransaction: request,
  }

  await api.setDepositStatusAlt(data.messageid, 'failed', depositStatusRequest);
};

const cancel = async (request: Trustly<CancelRequest>) => {
  const { data } = request.params;
  const depositStatusRequest = {
    message: 'Deposit Cancelled',
    rawTransaction: request,
  };
  try {
    await api.setDepositStatusAlt(data.messageid, 'cancelled', depositStatusRequest);
  } catch (e) {
    if (e.code === 562) {
      logger.debug('Cancelling not existed transaction', e);
      return;
    }

    throw e;
  }
};

const mapCountry = (country: string) => {
  if (country === 'Finland') {
    return 'FI';
  }
  if (country === 'Sweden') {
    return 'SE';
  }
  if (country === 'Germany') {
    return 'DE';
  }
  throw new Error('Unknown country!');
};

const kyc = async (request: Trustly<KYCRequest>, brandId: BrandId): Promise<'CONTINUE' | 'FINISH'> => {
  logger.debug('KYC callback notification', request);
  const { data } = request.params;

  if (data.abort) {
    if (data.abortmessage === 'underage') {
      logger.warn('Player age is under allowed minimum');
      return 'FINISH';
    }
    if (data.abortmessage === 'unverified') {
      logger.warn('Cannot collect KYC data for player');
      return 'FINISH';
    }
  }

  const player = {
    firstName: data.attributes.firstname,
    lastName: data.attributes.lastname,
    address: data.attributes.street,
    postCode: data.attributes.zipcode,
    city: data.attributes.city,
    countryId: mapCountry(data.attributes.country),
    dateOfBirth: data.attributes.dob,
    nationalId: mapPersonId(data.attributes.personid),
  };
  try {
    const depositResponse = await api.getDepositAlt(data.messageid);
    await api.updatePartialPlayer(brandId, depositResponse.deposit.playerId, player);
  } catch (e) {
    // TODO: need a better way to distinguish between pnp and normal deposit workflow. different callback urls maybe?
    try {
      const result = await api.registerPartialPlayer(brandId, { transactionKey: data.messageid, player });
      if (!result.isDeposit) return 'FINISH';
    } catch (err) {
      logger.warn('KYC callback notification registerPartialPlayer error', request, err);
      return 'FINISH';
    }
  }
  return 'CONTINUE';
};

const processHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { body } = req;
    const brandId: BrandId = (req.params.brandId: any);
    const mode: TrustlyMode = (req.params.mode: any);
    const trustly = trustlies[mode];
    logger.debug('Trustly request', body);

    if (!config.isTest) {
      await trustly.createNotificationResponse(body);
    }
    let kycResult = 'CONTINUE';

    switch (body.method) {
      case 'account':
        await account(body, brandId, mode);
        break;
      case 'credit':
        await credit(body, mode === 'bank', 'settled');
        break;
      case 'debit':
        await debit(body);
        break;
      case 'pending':
        // await credit(body, mode === 'bank', 'pending');
        break;
      case 'cancel':
        await cancel(body);
        break;
      case 'kyc':
        kycResult = await kyc(body, brandId);
        break;
      default:
        throw new Error(`Method '${body.method}' is not supported`);
    }

    if (config.isTest) {
      return res.json(testResult(body.method));
    }

    if (body.method === 'kyc') {
      const result = await trustlyCustom.createNotificationResponse(trustly, body, kycResult);
      return res.send(result);
    }

    const result = await trustly.createNotificationResponse(body);
    return res.send(result);
  } catch (e) {
    logger.error('Trustly deposit notification failed:', { e, body: req.body, params: req.params });
    return res.status(500).json({ error: { message: e.message } });
  }
};

module.exports = { processHandler };
