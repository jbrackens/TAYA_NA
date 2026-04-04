/* @flow */
import type { PaymentServerConfig } from '../../types';

const { Router } = require('express');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');
const {
  authorizeHandler,
  verifyuserHandler,
  transferHandler,
  cancelHandler,
} = require('./routes');
const config: PaymentServerConfig = require('../../../config');

const paymentiqConfig = config.providers.paymentiq;

const router: express$Router<> = Router();  

router.use(bodyParser.json());
router.use(basicAuth({
  users: {
    paymentiq: paymentiqConfig.password,
  },
}));
router.post('/authorize', authorizeHandler);
router.post('/verifyuser', verifyuserHandler);
router.post('/transfer', transferHandler);
router.post('/cancel', cancelHandler);
module.exports = router;
