/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const { identifyHandler, eventHandler } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.raw({ type: '*/*' }));

router.post('/identify', identifyHandler);
router.post('/event', eventHandler);
module.exports = router;
