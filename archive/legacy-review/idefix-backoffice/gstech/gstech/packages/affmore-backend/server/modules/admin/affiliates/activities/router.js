/* @flow */
const { Router } = require('express');
const routes = require('./routes');

const router: express$Router<> = Router({ mergeParams: true });  

router.get('/', routes.getAffiliateActivitiesHandler);

module.exports = router;
