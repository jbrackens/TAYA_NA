/* @flow */
const { Router } = require('express');

const router: express$Router<> = Router();

const routes = require('./routes');

router.post('/', routes.addCampaignContent);
router.put('/:campaignContentId', routes.updateCampaignContent);
router.delete('/:campaignContentId', routes.deleteCampaignContent);

module.exports = router;
