/* @flow */
const { Router } = require('express');
const routes = require('./routes');

const router: express$Router<> = Router({ mergeParams: true });  

router.get('/:year/:month', routes.getSubAffiliatesHandler);
router.post('/:subAffiliateId', routes.createSubAffiliateHandler);
router.put('/:subAffiliateId', routes.updateSubAffiliateHandler);
router.delete('/:subAffiliateId', routes.deleteSubAffiliateHandler);

module.exports = router;
