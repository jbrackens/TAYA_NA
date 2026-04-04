/* @flow */
import type { PaymentServerModule } from '../../types';

const api = require('./api');
const router = require('./router');

const paymentModule: PaymentServerModule = { api, router };
module.exports = paymentModule;
