// @flow
import type { PaymentServerModule } from '../../types';

const router = require('./router');
const api = require('./api');

const paymentModule: PaymentServerModule = { api, router };
module.exports = paymentModule;
