/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const WalletServer = require('./WalletServer');

const router: express$Router<> = Router();  
router.use(bodyParser.json());

router.use('/', WalletServer);
module.exports = router;
