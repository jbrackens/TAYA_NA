/* @flow */
const { Router } = require('express');
const multer = require('multer');
const { optionalGoogleMiddleware } = require('gstech-core/modules/google-sso');
const routes = require('./routes');

const upload = multer({ storage: multer.memoryStorage() });

const { auth: userAuth } = require('../../../auth/user/middleware');

const invoicesRouter = (router: express$Router<>): express$Router<> => {
  router.use('/', optionalGoogleMiddleware);
  router.post('/', userAuth(['admin', 'user']), routes.confirmAffiliateInvoiceHandler);
  router.get('/', userAuth(['admin', 'user', 'payer']), routes.getAffiliateInvoicesHandler);
  router.get('/:invoiceId', userAuth(['admin', 'user', 'payer']), routes.getAffiliateInvoiceHandler);
  router.post('/:invoiceId', userAuth(['admin', 'payer']), routes.markAffiliateInvoiceAsPaidHandler);

  return router;
};

const invoicesDraftRouter = (router: express$Router<>): express$Router<> => {
  router.use('/', optionalGoogleMiddleware);
  router.get('/', userAuth(['admin', 'user', 'payer']), routes.getAffiliateInvoiceDraftHandler);
  router.post('/', userAuth(['admin', 'user']), routes.createAffiliatePaymentHandler);

  return router;
};

const invoicesAttachmentsRouter = (router: express$Router<>): express$Router<> => {
  router.use('/', optionalGoogleMiddleware);
  router.post('/:invoiceId', upload.array('file', 10), routes.createAffiliateInvoiceAttachmentHandler);

  return router;
};

module.exports = ({
  invoicesRouter: invoicesRouter(Router({ mergeParams: true })),
  invoicesDraftRouter: invoicesDraftRouter(Router({ mergeParams: true })),
  invoicesAttachmentsRouter: invoicesAttachmentsRouter(Router({ mergeParams: true })),
}: { [string]: express$Router<> });
