/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');

const { getSession, getBalance, bet, win, rollback } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.json());

router.post('/GetSession', getSession);
router.post('/GetBalance', getBalance);
router.post('/Bet', bet);
router.post('/Win', win);
router.post('/Rollback', rollback);

module.exports = router;
