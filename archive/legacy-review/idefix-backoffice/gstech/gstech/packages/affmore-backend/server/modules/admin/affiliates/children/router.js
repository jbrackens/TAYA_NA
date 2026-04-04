/* @flow */
const { Router } = require('express');
const routes = require('./routes');

const router: express$Router<> = Router({ mergeParams: true });  

router.get('/', routes.getChildrenAffiliatesHandler);
router.post('/', routes.createChildAffiliateHandler);

module.exports = router;
