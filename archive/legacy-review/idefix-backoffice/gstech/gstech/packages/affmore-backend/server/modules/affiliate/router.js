/* @flow */
const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();  

router.get('/', routes.getAffiliateHandler);
router.put('/', routes.updateAffiliateHandler);
router.get('/overview/:year/:month', routes.getAffiliateOverviewHandler);
router.get('/revenues/:year/:month', routes.getAffiliateRevenuesHandler);
router.get('/deals', routes.getAffiliateDealsHandler);
router.get('/fees', routes.getAffiliateAdminFeesHandler);

router.post('/links', routes.createAffiliateLinkHandler);
router.get('/links', routes.getAffiliateLinksHandler);
router.get('/links/:linkId', routes.getAffiliateLinkClicksHandler);
router.put('/links/:linkId', routes.updateAffiliateLinkHandler);
router.delete('/links/:linkId', routes.deleteAffiliateLinkHandler);

router.get('/landings', routes.getLandingsHandler);
router.get('/landings/:brandId', routes.getLandingsHandler);

router.get('/players', routes.getAffiliatePlayersRevenueHandler);
router.get('/players/:playerId', routes.getAffiliatePlayerActivitiesHandler);
router.get('/players/:playerId/:year/:month', routes.getAffiliatePlayerActivitiesHandler);

router.get('/payments', routes.getAffiliatePaymentsHandler);
router.get('/sub-affiliates/:year/:month', routes.getSubAffiliatesHandler);
router.post('/children', routes.createChildAffiliateHandler);
router.get('/children', routes.getChildrenAffiliatesHandler);
router.get('/activities', routes.getAffiliateActivitiesHandler);

router.get('/api-token', routes.getAffiliateAPITokenHandler);
router.post('/api-token', routes.refreshAffiliateAPITokenHandler);

module.exports = router;
