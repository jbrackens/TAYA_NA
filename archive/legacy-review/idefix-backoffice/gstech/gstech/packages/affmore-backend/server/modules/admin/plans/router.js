/* @flow */
const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();  

router.post('/', routes.createPlanHandler);
router.get('/', routes.getPlansHandler);
router.get('/:planId', routes.getPlanHandler);
router.put('/:planId', routes.updatePlanHandler);
router.delete('/:planId', routes.deletePlanHandler);

module.exports = router;
