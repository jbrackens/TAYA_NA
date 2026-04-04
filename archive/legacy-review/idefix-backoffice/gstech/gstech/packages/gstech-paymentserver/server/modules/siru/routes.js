
/* @flow */
const _ = require('lodash');
const { axios } = require('gstech-core/modules/axios');

const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');

const config = require('../../../config');
const { calculateSignature } = require('./utils');

const siruConfig = config.providers.siru;

const processHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('SIRU process', req.params, req.body, req.headers);
    const brandedConfig = siruConfig.brands[(req.params.brandId: any)];
    const { body } = req;
    const cConf = _.find(_.values(brandedConfig.countries), x => x.merchantId === body.siru_merchantId);
    if (cConf == null) {
      throw Error(`Country not configured ${body.siru_merchantId}`);
    }

    const sig1 = calculateSignature(body, cConf, 'siru_uuid,siru_merchantId,siru_submerchantReference,siru_purchaseReference,siru_event'.split(','));
    const sig2 = body.siru_signature;
    if (sig1 !== sig2) { throw Error('Invalid signature'); }

    if (body.siru_event === 'success') {
      const form = {
        merchantId: cConf.merchantId,
        purchaseReference: body.siru_purchaseReference,
        submerchantReference: brandedConfig.site,
      };

      const qs = _.extend({ signature: calculateSignature(form, cConf, 'merchantId,submerchantReference,purchaseReference'.split(',')) }, form);
      const options = { params: qs };
      const uri = `${brandedConfig.endpoint}/payment/byPurchaseReference.json`;
      logger.debug('doGet', { options, uri });
      const { data: purchases } = await axios.get(uri, options);
      if (purchases.errors) {
        throw Error(purchases.errors);
      }

      logger.debug('Fetch purchases!', purchases);

      const purchase = _.find(purchases.purchases.filter(x => x.status === 'confirmed'), x => x.uuid === body.siru_uuid);
      if (purchase == null) { throw Error('No valid purchase'); }
      const deposit = {
        amount: money.parseMoney(purchase.basePrice),
        account: String(purchase.customerNumber),
        externalTransactionId: purchase.uuid,
        accountParameters: { },
        message: purchase.status,
        rawTransaction: purchases,
        paymentCost: 0,
      };
      const depositResult = await client.processDeposit(purchase.customerReference, purchase.purchaseReference, deposit);

      return res.json(depositResult);
    }

    return res.json({ status: body.siru_event });
  } catch (e) {
    return next(e);
  }
};

module.exports = { processHandler };
