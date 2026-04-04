/* @flow */
const { Router } = require('express');
const { optionalGoogleMiddleware } = require('gstech-core/modules/google-sso');

const routes = require('./routes');

const dealsRouter = require('./deals/router');
const feesRouter = require('./fees/router');
const playersRouter = require('./players/router');
const { invoicesRouter, invoicesDraftRouter, invoicesAttachmentsRouter } = require('./invoices/router');
const linksRouter = require('./links/router');
const logsRouter = require('./logs/router');
const subAffiliatesRouter = require('./sub-affiliates/router');
const childrenAffiliatesRouter = require('./children/router');
const activitiesRouter = require('./activities/router');
const callbacksRouter = require('./callbacks/router');

const { auth: userAuth } = require('../../auth/user/middleware');

const router: express$Router<> = Router();  

router.use('/', optionalGoogleMiddleware);

router.get('/', userAuth(['admin', 'user']), routes.getAffiliatesHandler);
router.get('/:affiliateId', userAuth(['admin', 'user']), routes.getAffiliateHandler);
router.put('/:affiliateId', userAuth(['admin', 'user']), routes.updateAffiliateHandler);
router.get('/:affiliateId/overview/:year/:month', userAuth(['admin', 'user']), routes.getAffiliateOverviewHandler);
router.get('/:affiliateId/revenues/:year/:month', userAuth(['admin', 'user']), routes.getAffiliateRevenuesHandler);

router.use('/:affiliateId/deals', userAuth(['admin', 'user']), dealsRouter);
router.use('/:affiliateId/fees', userAuth(['admin', 'user']), feesRouter);
router.use('/:affiliateId/players', userAuth(['admin', 'user']), playersRouter);
router.use('/:affiliateId/invoices', userAuth(['admin', 'user', 'payer']), invoicesRouter);
router.use('/:affiliateId/invoice-draft', userAuth(['admin', 'user']), invoicesDraftRouter);
router.use('/:affiliateId/invoice-attachment', userAuth(['admin', 'user']), invoicesAttachmentsRouter);
router.use('/:affiliateId/links', userAuth(['admin', 'user']), linksRouter);
router.use('/:affiliateId/logs', userAuth(['admin', 'user']), logsRouter);
router.use('/:affiliateId/sub-affiliates', userAuth(['admin', 'user']), subAffiliatesRouter);
router.use('/:affiliateId/children', userAuth(['admin', 'user']), childrenAffiliatesRouter);
router.use('/:affiliateId/activities', userAuth(['admin', 'user']), activitiesRouter);
router.use('/:affiliateId/callbacks', userAuth(['admin', 'user']), callbacksRouter);

module.exports = router;
