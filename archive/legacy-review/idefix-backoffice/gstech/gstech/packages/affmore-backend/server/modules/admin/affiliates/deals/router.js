/* @flow */
const { Router } = require('express');
const routes = require('./routes');

const router: express$Router<> = Router({ mergeParams: true });  

router.get('/', routes.getAffiliateDealsHandler);
router.put('/', routes.upsertAffiliateDealHandler);
router.delete('/:brandId', routes.deleteAffiliateDealHandler);

module.exports = router;
