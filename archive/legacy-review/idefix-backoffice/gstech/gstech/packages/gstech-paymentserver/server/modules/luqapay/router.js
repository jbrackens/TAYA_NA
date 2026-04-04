/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const { processHandler, successProcessHandler } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.post('/process', processHandler);
router.post('/', successProcessHandler);

module.exports = router;
