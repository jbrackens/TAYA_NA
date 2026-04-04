/* @flow */
const errorCodes = require('gstech-core/modules/errors/error-codes');
const api = require('gstech-core/modules/clients/backend-payment-api');
const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');

const {
  validateWithdrawResultSignature,
  withdrawalResultSignature,
  validateWdRequest,
  validateIpnSha256ResultSignature,
  validateIpnMd5ResultSignature,
  validateIdentifyResultSignature,
  validateKYCResultSignature,
} = require('./signature');

const { paymentCheck } = require('./api-client');

const depositIpnHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const { query } = req;
  const { state, addfield, end_user }: { state: string, addfield: Object, end_user: Object, ... } = query;

  if (!validateIpnMd5ResultSignature(query)) {
    logger.error('Invalid Euteller IPN signature', query);
    return next(new Error('Invalid IPN signature'));
  }
  const username = (end_user && end_user.login) || (addfield && addfield.username); // Sometimes getting ipn=true notification for siirto. Handle both cases
  const amount = money.parseMoney(query.original_amount);
  const paymentCost = amount - money.parseMoney(query.amount);
  if (state === '200') {
    if (amount > 0) {
      const deposit = {
        amount,
        account: '',
        externalTransactionId: query.bankref,
        accountParameters: { },
        message: query.state,
        rawTransaction: query,
        paymentCost,
      };
      await client.processDeposit(username, addfield.transactionKey, deposit);
    }
  }
  return res.json({ ok: true });
};

const siirtoIpnHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const { query } = req;
  const { state, addfield }: { state: string, addfield: Object, ... } = query;

  if (!validateIpnSha256ResultSignature(query)) {
    logger.error('Invalid Euteller IPN signature', query);
    return next(new Error('Invalid IPN signature'));
  }

  const amount = money.parseMoney(query.original_amount);
  const paymentCost = amount - money.parseMoney(query.amount);
  if (amount > 0 && state === '200') {
    const tx = await paymentCheck(Number(query.orderid));
    const deposit = {
      amount,
      account: addfield && addfield.phoneNumber ? `+${addfield.phoneNumber}` : '',
      accountHolder: tx !== null && tx.response !== null && tx.response.account_owner !== null && tx.response.account_owner !== '' ? tx.response.account_owner : undefined,
      externalTransactionId: query.bankReference,
      accountParameters: { siirtoNumber: addfield.phoneNumber },
      message: query.state_text,
      rawTransaction: query,
      paymentCost,
      status: 'settled',
    };
    await client.processDeposit(addfield.username, addfield.transactionKey, deposit);
  }
  return res.json({ ok: true });
};

const identifyHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const { query } = req;
  const {
    status,
    ipn,
    kyc,
    addfield,
  }: { status: string, ipn: string, kyc: Object, addfield: Object, ... } = query;

  if (!validateIdentifyResultSignature(query)) {
    logger.error('Invalid Euteller Identify IPN signature', query);
    return next(new Error('Invalid Identify IPN signature'));
  }
  if (status === '1' && ipn === 'signpay') {
    logger.debug('Identification received', query);
    const content = `Identification from Euteller (${kyc.EutellerID}):
- Phone number: ${kyc.phoneNumber}
- Date of Birth: ${kyc.DateOfBirth}
- Name: ${kyc.Name}
- Address: ${kyc.Address}
- Postcode: ${kyc.PostalCode}
- City: ${kyc.City}`;

    const createDocumentRequest = {
      type: 'identification',
      content,
      source: 'Euteller',
      fields: query,
    };
    await api.addDocument(addfield.username, createDocumentRequest);
  }
  return res.json({ status: 'OK' });
};

const ipnHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { query } = req;
    logger.debug('Euteller process ipn', query);

    const { ipn } = query;
    if (ipn === 'siirto') {
      return await siirtoIpnHandler(req, res, next);
    }
    if (ipn === 'true') {
      return await depositIpnHandler(req, res, next);
    }
    logger.debug('Unsupported Euteller ipn', query);
    return res.json({ ok: true });
  } catch (e) {
    logger.error('Euteller process failed', e);
    return next(e);
  }
};


const withdrawHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { query } = req;
    const { data }: { data: Object, ... } = query;
    let ok: ?boolean = true;
    logger.debug('Euteller process', req.params, query);
    if (!validateWdRequest(req.params)) {
      logger.error('Invalid Euteller request signature', req.params);
      return next(new Error('Invalid request signature'));
    }

    if (!validateWithdrawResultSignature(query)) {
      logger.error('Invalid Euteller signature', query);
      return next(new Error('Invalid Euteller signature'));
    }
    if (data.status === '504') {
      const complete = {
        externalTransactionId: data.transactionid, // Not really external
        message: data.status,
        rawTransaction: req.query,
      };
      const { complete: c } = await client.setWithdrawalStatus(req.params.username, req.params.transactionKey, 'complete', complete);
      ok = c;
    } else if (data.status === '140') {
      const complete = {
        externalTransactionId: data.transactionid, // Not really needed for failed
        message: data.additional_info != null ? Buffer.from(data.additional_info, 'base64').toString('ascii') : 'OK',
        rawTransaction: req.query,
      };
      await client.setWithdrawalStatus(req.params.username, req.params.transactionKey, 'failed', complete);
    } else {
      logger.debug('Skipped Euteller wd notification', query);
    }
    const response = {
      status: ok ? 'OK' : 'FAILED',
      request_tismestamp: query.request_timestamp,
      response_timestamp: Math.floor(Date.now() / 1000),
      data: {
        transactionid: data.transactionid,
        customer: data.customer,
      },
    };
    const security = withdrawalResultSignature(response);
    return res.json({ ...response, security });
  } catch (e) {
    logger.error('Euteller process failed', e);
    return next(e);
  }
};

const kycHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const query: any = req.body;
    logger.debug('Euteller kyc process', { params: req.params, query });

    if (!validateKYCResultSignature(query)) {
      logger.error('Invalid Euteller kyc signature', query);
      throw new Error('Invalid Euteller kyc signature');
    }
    if (!query.extra_fields || !query.extra_fields.username || !query.extra_fields.transactionKey) {
      logger.warn('Invalid Euteller kyc data', query);
      return res.json({ ok: true });
    }
    const d = await client.getDeposit(query.extra_fields.username, query.extra_fields.transactionKey);

    const amount = money.parseMoney(query.original_amount);
    const deposit = {
      amount,
      account: d.deposit.paymentMethod === 'Siirto' ? `+${query.extra_fields.phoneNumber}` : query.kyc.iban_masked || '',
      accountHolder: query !== null && query.kyc !== null && query.kyc.account_owner !== null && query.kyc.account_owner !== '' ? query.kyc.account_owner : undefined,
      externalTransactionId: `${query.bank_reference}`,
      accountParameters: {
        iban_hashed: query.kyc.iban_hashed && query.kyc.iban_hashed !== '' ? query.kyc.iban_hashed : undefined,
      },
      message: `confirmed ${query.kyc.account_owner}`,
      rawTransaction: query,
      status: 'settled',
    };
    logger.debug('Euteller processDeposit', query.extra_fields.username, query.extra_fields.transactionKey, deposit);
    try {
      await client.processDeposit(query.extra_fields.username, query.extra_fields.transactionKey, deposit);
    } catch (e) {
      if (e.code === errorCodes.INVALID_EXTERNAL_TRANSACTION_ID.code) {
        logger.error('Euteller process failed. ', e);
        return res.json({ ok: true });
      }

      throw e;
    }
    return res.json({ ok: true });
  } catch (e) {
    logger.error('Euteller process failed', e);
    return next(e);
  }
};

module.exports = {
  withdrawHandler,
  ipnHandler,
  identifyHandler,
  kycHandler,
};
