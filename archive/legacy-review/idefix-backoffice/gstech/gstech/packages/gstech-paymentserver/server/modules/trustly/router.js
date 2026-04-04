/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const { processHandler: depositProcessHandler } = require('./routes-deposit');
const { processHandler: payoutProcessHandler } = require('./routes-payout');
const { processHandler: identifyProcessHandler } = require('./routes-identify');


const router: express$Router<> = Router();  

router.use(bodyParser.raw());
router.use(bodyParser.json());

router.post('/process/deposit/:brandId/:mode', depositProcessHandler);
router.post('/process/payout/:brandId/:mode', payoutProcessHandler);
router.post('/process/identify/:username', identifyProcessHandler);

module.exports = router;
