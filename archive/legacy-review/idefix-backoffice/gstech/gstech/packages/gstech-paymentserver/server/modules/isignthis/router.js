// @flow
const { Router } = require('express');
const bodyParser = require('body-parser');
const { processHandler } = require('./routes');
const { camelCaseifyMiddleware } = require('./utils');

const router: express$Router<any> = Router();

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.use('/', camelCaseifyMiddleware );
router.post('/', processHandler);

module.exports = router;