/* @flow */
const { Router } = require('express');
const routes = require('./routes');

const router: express$Router<> = Router({ mergeParams: true });  

router.get('/', routes.getAffiliatePaymentBalancesHandler);
router.get('/:affiliateId', routes.getAffiliatePaymentBalanceHandler);

module.exports = router;
