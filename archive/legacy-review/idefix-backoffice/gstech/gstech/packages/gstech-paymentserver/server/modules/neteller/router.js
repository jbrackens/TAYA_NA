/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');

const router: express$Router<> = Router();

router.use(bodyParser.json());
router.post('/', routes.handler);

module.exports = router;
