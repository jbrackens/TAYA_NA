/* @flow */
const { Router } = require('express');
const routes = require('./routes');

const router: express$Router<> = Router({ mergeParams: true });  

router.post('/', routes.createAffiliateLinkHandler);
router.get('/', routes.getAffiliateLinksHandler);
router.get('/:linkId', routes.getAffiliateLinkClicksHandler);
router.put('/:linkId', routes.updateAffiliateLinkHandler);
router.delete('/:linkId', routes.deleteAffiliateLinkHandler);

module.exports = router;
