/* @flow */
import type { PaymentServerModule } from '../../types';

const { Router } = require('express');

const api = require('./api');

const paymentModule: PaymentServerModule = { api, router: new Router() };
module.exports = paymentModule;
