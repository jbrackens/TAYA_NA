/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const {
  processHandler,
} = require('./routes');

const router: express$Router<> = Router();  
router.use(bodyParser.urlencoded({ extended: true }));

router.post('/process/:brandId/:authorizationId', processHandler);
module.exports = router;
