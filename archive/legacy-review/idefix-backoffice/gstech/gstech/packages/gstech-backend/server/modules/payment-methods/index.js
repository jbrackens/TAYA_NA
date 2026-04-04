/* @flow */
const {
  getPaymentMethodHandler,
  getPaymentMethodsHandler,
  updatePaymentMethodHandler,
} = require('./routes');

module.exports = {
  routes: {
    getPaymentMethodHandler,
    getPaymentMethodsHandler,
    updatePaymentMethodHandler,
  },
};
