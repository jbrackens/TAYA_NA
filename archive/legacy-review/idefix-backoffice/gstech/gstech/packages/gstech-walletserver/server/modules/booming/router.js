/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');

const { callback, rollback } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.json());

router.post('/callback', callback);
router.post('/rollback_callback', rollback);

module.exports = router;
