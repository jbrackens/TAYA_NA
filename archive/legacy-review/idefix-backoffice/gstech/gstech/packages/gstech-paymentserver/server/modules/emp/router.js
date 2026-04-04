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

router.use(bodyParser.urlencoded({ extended: false }));

router.post('/process', processHandler);
module.exports = router;
