/* @flow */
const { Router } = require('express');

const pg = require('gstech-core/modules/pg');

const routes = require('./routes');
const { getCampaign } = require('./repository');
const campaignContentRouter = require('./CampaignContent/router');
const audienceRulesRouter = require('./AudienceRule/router');

const router: express$Router<> = Router();  

router.param('campaignId', async (req: any, res, next, param) => {
  const campaignId = Number(param);

  try {
    const campaign = await getCampaign(pg, campaignId);
    if (campaign) {
      req.campaign = campaign;
      next();
    } else {
      res.status(404).json({ error: { message: `Campaign ${campaignId} not found` } });
    }
  } catch (e) {
    res.status(400).json({ error: { message: 'Invalid campaignId parameter' } });
  }
});

router.get('/', routes.getCampaigns);
router.post('/', routes.createCampaign);
router.get('/with-rewards', routes.getCampaignsWithRewards);
router.get('/:campaignId', routes.getCampaign);
router.put('/:campaignId', routes.updateCampaign);
router.delete('/:campaignId', routes.archiveCampaign);
router.post('/:campaignId/activate', routes.activateCampaign);
router.post('/:campaignId/duplicate', routes.duplicateCampaign);
router.post('/:campaignId/send-emails', routes.sendCampaignEmails);
router.post('/:campaignId/send-smses', routes.sendCampaignSmses);
router.post('/:campaignId/stop', routes.stopCampaign);
router.post('/:campaignId/toggle-preview', routes.togglePreviewMode);
router.get('/:campaignId/csv-audience', routes.getCsvAudience);
router.get('/:campaignId/stats', routes.getCampaignStats);

router.use('/:campaignId/content', campaignContentRouter);

router.use('/:campaignId/audience-rules', audienceRulesRouter);

router.post('/:campaignId/reward-rules', routes.addRewardRule);
router.put('/:campaignId/reward-rules/:rewardRuleId', routes.updateRewardRule);
router.delete('/:campaignId/reward-rules/:rewardRuleId', routes.deleteRewardRule);

module.exports = router;
