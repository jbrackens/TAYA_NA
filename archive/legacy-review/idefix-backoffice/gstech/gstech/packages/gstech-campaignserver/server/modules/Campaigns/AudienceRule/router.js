/* @flow */

const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();

router.post('/', routes.addAudienceRule);
router.post('/csv', routes.addCsvAudienceRule);
router.put('/:audienceRuleId', routes.updateAudienceRule);
router.delete('/:audienceRuleId', routes.deleteAudienceRule);

module.exports = router;
