/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');

const config = require('../../../config');

const { check, balance, debit, credit, cancel, sid } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.json());

router.post('/check', check);
router.post('/balance', balance);
router.post('/debit', debit);
router.post('/credit', credit);
router.post('/cancel', cancel);

if (!config.isProduction) {
  router.post('/sid', sid);
}

module.exports = router;
