/* @flow */
const { Router } = require('express');
const WalletServer = require('./WalletServer');

const router: express$Router<> = Router();  

router.use('/', WalletServer);
module.exports = router;
