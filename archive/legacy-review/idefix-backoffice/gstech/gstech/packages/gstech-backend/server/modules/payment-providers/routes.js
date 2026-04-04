/* @flow */

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const {
  getPaymentProviderDetails,
  updatePaymentProviderDetails,
} = require('./PaymentProviders');
const schemas = require('./schemas');

const getPaymentProviderDetailsHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { paymentProviderId }: { paymentProviderId: Id } = (req.params: any);

    const paymentProvider = await getPaymentProviderDetails(paymentProviderId);

    return res.status(200).json(paymentProvider);
  } catch (err) {
    logger.warn('Get payment provider details failed');
    return next(err);
  }
};

const updatePaymentProviderDetailsHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { paymentProviderId }: { paymentProviderId: Id } = (req.params: any);
    const draft = validate(req.body, schemas.updatePaymentProviderDetailsSchema);

    await updatePaymentProviderDetails(paymentProviderId, draft);

    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.warn('Update payment provider details failed');
    return next(err);
  }
};

module.exports = {
  getPaymentProviderDetailsHandler,
  updatePaymentProviderDetailsHandler,
};
