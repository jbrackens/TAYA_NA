/* @flow */
const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();  

router.get('/', routes.getUsersHandler);

module.exports = router;
