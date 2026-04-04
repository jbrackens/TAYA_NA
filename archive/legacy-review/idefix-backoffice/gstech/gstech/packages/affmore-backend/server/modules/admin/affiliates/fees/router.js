/* @flow */
const { Router } = require('express');
const { getAffiliateAdminFeesHandler, updateAffiliateAdminFeesHandler } = require('./routes');

const router: express$Router<> = Router({ mergeParams: true });

router.get('/', getAffiliateAdminFeesHandler);
router.put('/', updateAffiliateAdminFeesHandler);

module.exports = router;
