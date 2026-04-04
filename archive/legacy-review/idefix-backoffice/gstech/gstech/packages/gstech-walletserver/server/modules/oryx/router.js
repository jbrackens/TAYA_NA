/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');

const config = require('../../../config');
const { authenticate, balance, transaction, rollback } = require('./routes');

const configuration = config.providers.oryx;
const router: express$Router<> = Router();  
const authorize = (username: any, password: any) =>
  configuration.gameServer.auth.username === username &&
  configuration.gameServer.auth.password === password;

router.use(basicAuth({ authorizer: authorize }));
router.use(bodyParser.json());

router.post('/tokens/:token/authenticate', authenticate);
router.post('/players/:playerId/balance', balance);
router.post('/game-transaction', transaction);
router.post('/game-transactions/:transactionId', rollback);

module.exports = router;
