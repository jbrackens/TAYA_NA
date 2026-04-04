
/* @flow */
const xmlescape = require('xml-escape');
const _ = require('lodash');

const short = require('short-uuid');
const backend = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const { guard } = require('gstech-core/modules/utils');
const config = require('../../../config');
const { doRequest, parseToken } = require('./utils');

const translator = short();

const conf = config.providers.worldpay;


const processRequestInfo = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const failUrl = req.query.fail;
    const okUrl = req.query.ok;
    const { cookie } = req.query;
    const txKey = req.params.transactionKey;
    const requestBody = (req.body: any);

    logger.debug('worldpay process requestInfo', txKey, req.body);
    const paRes = requestBody.PaRes;
    const sessionId = txKey;

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE paymentService PUBLIC "-//Worldpay//DTD Worldpay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd">
<paymentService version="1.4" merchantCode="${conf.merchantCode}">
<submit>
  <order orderCode="${txKey}" installationId="${conf.installationId}">
    <info3DSecure>
      <paResponse>${xmlescape(paRes)}</paResponse>
    </info3DSecure>
    <session id="${sessionId}"/>
  </order>
</submit>
</paymentService>`;
    const h = {
      Cookie: `${cookie.split(';')[0]};`,
    };
    const { reply, error } = await doRequest(body, h);
    logger.debug('processRequestInfo2', { reply, error });
    const type = guard(reply, r => r.orderStatus[0].payment[0].lastEvent[0]);
    logger.debug('Response type', txKey, type);
    if (type === 'AUTHORISED') {
      return res.redirect(okUrl);
    }
    return res.redirect(failUrl);
  } catch (e) {
    logger.error('world pay callback failed', e);
    return next(e);
  }
};

const process = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Worldpay Process', req.body, req.headers);

    const event = (req.body: any).paymentService.notify[0].orderStatusEvent[0];
    const { orderCode } = event.$;
    const txKey = orderCode.length < 32 ? translator.toUUID(orderCode) : orderCode;
    // $FlowFixMe
    const payment = guard(event, e => e.payment[0], ({}: any));
    const exponent = 10.0 ** parseInt(guard(payment, p => p.amount[0].$.exponent), 10);
    const amount = (Number(guard(payment, p => p.amount[0].$.value)) / exponent).toFixed(2);
    const creditDebit = guard(payment, p => p.amount[0].$.debitCreditIndicator);
    const type = guard(payment, p => p.lastEvent[0]);
    const token = guard(event, e => e.token[0]);

    if (_.includes(['SENT_FOR_REFUND', 'REFUNDED', 'SETTLED', 'REFUNDED_BY_MERCHANT', 'SENT_FOR_AUTHORISATION'], type)) {
      logger.debug('Ignore refund message', type);
      return res.end('[OK]');
    }

    if (type === 'REFUND_FAILED') {
      logger.debug('WorldPay withdrawal failed', txKey); // TODO: must be same as withdrawal in truslty
      return res.end('[OK]');
    }

    logger.debug('Worldpay process 2', { txKey, payment });

    if (type === 'SENT_FOR_AUTHORISATION' || type === 'CAPTURED' || type === 'REFUSED' || type === 'REJECTED') {
      logger.debug('Log WorldPay status', type, { payment });
      return res.end('[OK]');
    }

    if (amount == null || creditDebit !== 'credit') {
      logger.debug('Skipping Worldpay notification', { amount, creditDebit, txKey, payment });
      return res.end('[OK]');
    }

    if (type !== 'AUTHORISED') {
      logger.debug('Skipping Worldpay notification', { amount, creditDebit, txKey, type, payment });
      return res.end('[OK]');
    }

    const accountReferenceWithToken = guard(payment, (p: any) => p.paymentMethodDetail[0].card[0].$.number);
    const accountReference = guard(payment, (p: any) => p.cardNumber[0], accountReferenceWithToken);
    const accountParameters = (token != null) ? parseToken(token) : {};
    const accountHolder = guard(token, (t: any) => t.paymentInstrument[0].cardDetails[0].cardHolderName[0].trim());

    const processDeposit = {
      amount: money.parseMoney(amount),
      account: accountReference,
      accountHolder,
      externalTransactionId: orderCode,
      accountParameters,
      message: 'Deposit',
      rawTransaction: req.body,
    };

    await backend.processDepositAlt(txKey, processDeposit);
    return res.end('[OK]');
  } catch (e) {
    logger.error('world pay callback failed', e);
    return res.end('[FAIL]');
  }
};

module.exports = { processRequestInfo, process };
