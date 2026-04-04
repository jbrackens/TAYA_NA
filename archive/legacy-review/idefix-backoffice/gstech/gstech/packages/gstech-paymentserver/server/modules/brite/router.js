/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const { processHandler } = require('./routes');
const { camelCaseifyMiddleware, logStateMiddleware } = require('./utils');

const router: express$Router<> = Router();  

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.use('/', camelCaseifyMiddleware, logStateMiddleware);

router.post('/:brandId/:mode', processHandler);

module.exports = router;
