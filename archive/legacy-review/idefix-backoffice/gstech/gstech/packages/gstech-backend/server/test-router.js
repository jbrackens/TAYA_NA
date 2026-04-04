/* @flow */
const { Router } = require('express');
const { testRoutes: { initTestSessionHandler } } = require('./modules/sessions');
const { testWithdrawalHandler } = require('./modules/payments/test-routes');
const { testRoutes: { testPartialLoginHandler } } = require('./modules/partial')

const testRouter: express$Router<> = Router({ mergeParams: true });  
testRouter.post('/init-session', initTestSessionHandler);

const apiTestRouter: express$Router<> = Router({ mergeParams: true });  
apiTestRouter.post('/test-withdraw', testWithdrawalHandler);
apiTestRouter.post('/test-partial', testPartialLoginHandler);

module.exports = { testRouter, apiTestRouter };
