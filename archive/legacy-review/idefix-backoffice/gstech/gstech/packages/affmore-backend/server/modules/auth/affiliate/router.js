/* @flow */
const { Router } = require('express');
const routes = require('./routes');

const { auth: affiliateAuth } = require('./middleware');

const router: express$Router<> = Router();  

// router.post('/register', routes.registerHandler);
router.post('/login', routes.loginHandler);
router.post('/accept-tc', affiliateAuth(), routes.acceptTCHandler);
router.post('/password/change', affiliateAuth(), routes.passwordChangeHandler);
router.post('/password/forgot', routes.passwordForgotHandler);
router.post('/password/update', routes.passwordUpdateHandler);

module.exports = router;
