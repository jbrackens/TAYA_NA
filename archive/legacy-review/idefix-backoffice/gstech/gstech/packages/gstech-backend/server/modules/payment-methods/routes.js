/* @flow */

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const PaymentMethods = require('./PaymentMethods');
const { updatePaymentMethodSchema } = require('./schemas');

const getPaymentMethodsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction) => {
  try {
    const methods = await PaymentMethods.getPaymentMethods();
    res.status(200).json(methods);
  } catch (err) {
    logger.warn('Get payment methods failed');
    next(err);
  }
};

const getPaymentMethodHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { paymentMethodId }: { paymentMethodId: Id } = (req.params: any);
    const paymentProviders = await PaymentMethods.getPaymentMethodWithProviders(paymentMethodId);
    return res.status(200).json(paymentProviders);
  } catch (err) {
    logger.warn('Get payment method failed');
    return next(err);
  }
};

const updatePaymentMethodHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { paymentMethodId }: { paymentMethodId: Id } = (req.params: any);
    const draft = validate(req.body, updatePaymentMethodSchema);
    await PaymentMethods.updatePaymentMethod(paymentMethodId, draft);

    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.warn('Update payment method failed');
    return next(err);
  }
}

module.exports = {
  getPaymentMethodHandler,
  getPaymentMethodsHandler,
  updatePaymentMethodHandler,
};
