/* @flow */

const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();

router.get('/init', routes.getInitialData);
router.get('/countries', routes.getCountries);
router.get('/languages', routes.getLanguages);
router.get('/rewards', routes.getRewards);
router.get('/segments', routes.getSegments);
router.get('/tags', routes.getTags);

module.exports = router;
