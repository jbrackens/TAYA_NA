/* @flow */
const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();  

router.post('/', routes.createLandingHandler);
router.get('/', routes.getLandingsHandler);
router.put('/:landingId', routes.updateLandingHandler);
router.delete('/:landingId', routes.deleteLandingHandler);
router.get('/:brandId', routes.getLandingsHandler);

module.exports = router;
