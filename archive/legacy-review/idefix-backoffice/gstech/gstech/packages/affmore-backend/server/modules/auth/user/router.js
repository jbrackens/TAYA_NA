/* @flow */
const { Router } = require('express');
const routes = require('./routes');

const router: express$Router<> = Router();  

router.post('/login', routes.loginHandler);

module.exports = router;
