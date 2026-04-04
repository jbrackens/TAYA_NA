/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');

const { callback } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.json());
router.post('/', callback);

module.exports = router;
