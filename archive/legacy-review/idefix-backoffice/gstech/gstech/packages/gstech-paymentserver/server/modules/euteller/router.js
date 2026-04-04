/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const {
  withdrawHandler,
  ipnHandler,
  identifyHandler,
  kycHandler,
} = require('./routes');

const router: express$Router<> = Router();  
router.use(bodyParser.json());

router.get('/ipn', ipnHandler);
router.get('/identify', identifyHandler);
router.post('/kyc', kycHandler);
router.get('/wd/:transactionKey/:username/:signature', withdrawHandler);
module.exports = router;
