/* @flow */
const { Router } = require('express');
// TODO: better typing needed
const bodyParser: any = require('body-parser');
const {
  processRequestInfo,
  process,
} = require('./routes');
require('body-parser-xml')(bodyParser);

const router: express$Router<> = Router();  
router.use(bodyParser.json());
router.use(bodyParser.xml());
router.use(bodyParser.urlencoded({ extended: false }));

router.post('/request/:transactionKey', processRequestInfo);
router.post('/worldpay', process);

module.exports = router;
