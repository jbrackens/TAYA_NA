/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const { processHandler } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.post('/', processHandler);

module.exports = router;
