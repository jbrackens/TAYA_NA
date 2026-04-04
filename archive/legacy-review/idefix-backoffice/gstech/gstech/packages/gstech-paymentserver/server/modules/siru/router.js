/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const {
  processHandler,
} = require('./routes');

const router: express$Router<> = Router();  
router.use(bodyParser.json({
  type: '*/json',
}));

router.post('/process/:brandId', processHandler);
module.exports = router;
