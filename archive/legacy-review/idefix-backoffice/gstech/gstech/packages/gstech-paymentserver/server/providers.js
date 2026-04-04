/* @flow */
import type { PaymentProvider } from 'gstech-core/modules/constants';
import type { PaymentServerModule, PaymentProviderApi } from './types';

const _ = require('lodash');

const paymentiq = require('./modules/paymentiq');
const piqcashier = require('./modules/piqcashier');
const siru = require('./modules/siru');
const skrill = require('./modules/skrill');
const zimpler = require('./modules/zimpler');
const neteller = require('./modules/neteller');
const trustly = require('./modules/trustly');
const euteller = require('./modules/euteller');
const jeton = require('./modules/jeton');
const muchbetter = require('./modules/muchbetter');
const bov = require('./modules/bov');
const emp = require('./modules/emp');
const qpay = require('./modules/qpay');
const worldpay = require('./modules/worldpay');
const veriff = require('./modules/veriff');
const neosurf = require('./modules/neosurf');
const luqapay = require('./modules/luqapay');
const brite = require('./modules/brite');
const isignthis = require('./modules/isignthis');

const paymentProviders: { [PaymentProvider]: PaymentServerModule } = {
  Bambora: piqcashier,
  Kluwp: piqcashier,
  Interac: piqcashier,
  Directa24: piqcashier,
  Flykk: piqcashier,
  MobulaPay: piqcashier,
  AstroPayCard: piqcashier,
  Pay4Fun: piqcashier,
  EMP: paymentiq, // Not used
  Mifinity: paymentiq, // Not used
  SiruMobile: siru,
  Skrill: skrill,
  Zimpler: zimpler,
  Neteller: neteller,
  Trustly: trustly,
  Euteller: euteller,
  Jeton: jeton,
  MuchBetter: muchbetter,
  BOV: bov,
  EMP2: emp,
  QPay: qpay,
  Worldpay: worldpay,
  Veriff: veriff,
  Neosurf: neosurf,
  Luqapay: luqapay,
  Brite: brite,
  ISX: isignthis,
};

const providers: { [PaymentProvider]: PaymentProviderApi } = _.mapValues(paymentProviders, p => p.api);
const routers: { [PaymentProvider]: express$Router<> } = _.mapValues(paymentProviders, p => p.router);

module.exports = { providers, routers };
