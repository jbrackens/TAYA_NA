/* @flow */
const { Router } = require('express');
const routes = require('./routes');

const router: express$Router<> = Router({ mergeParams: true });  

router.get('/', routes.getAffiliatePlayersRevenueHandler);
router.get('/:playerId', routes.getAffiliatePlayerActivitiesHandler);
router.put('/:playerId', routes.updateAffiliatePlayerHandler);
router.get('/:playerId/:year/:month', routes.getAffiliatePlayerActivitiesHandler);

module.exports = router;
