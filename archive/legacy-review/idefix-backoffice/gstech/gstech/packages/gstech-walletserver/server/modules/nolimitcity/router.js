/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const { handler } = require('./routes');

const router: express$Router<> = Router();  
router.use(bodyParser.json());

router.post('/', handler);

module.exports = router;
