/* @flow */

const express = require('express');
const bodyParser = require('body-parser');

const middleware = require('gstech-core/modules/express-middleware');
const { createSwaggerRouter } = require('gstech-core/modules/swagger');

const integrationsRouter = require('./modules/Integrations/router');
const { getPlayerCampaigns, getPlayerCampaignsWithRewards, addContentEvent } = require('./modules/Campaigns/routes');
const { getPlayerNotifications } = require('./modules/Campaigns/CampaignContent/routes');
const { getContentList } = require('./modules/Content/routes');

const {
  getPlayerSentContent,
  getPlayerSubscriptionOptions,
  updatePlayerSubscriptionOptions,
  snoozePlayerSubscription,
} = require('./modules/Players/routes');
const { sendEmailDirectly, sendEmailForExternalCampaign } = require('./modules/Emails/routes');
const { sendSmsForExternalCampaign } = require('./modules/Smses/routes');

const app: express$Application<> = express();

app.use(bodyParser.json());

app.get('/api/v1/status', middleware.healthCheck);

// Non auth routes
app.use('/api/v1/integrations/', integrationsRouter);

// Auth routes
app.all('*', middleware.requireAuthenticationToken('campaignServer'));

app.get('/api/v1/players/:externalPlayerId/campaigns', getPlayerCampaigns);
app.get('/api/v1/players/:externalPlayerId/campaigns/with-rewards', getPlayerCampaignsWithRewards);
app.post('/api/v1/players/:externalPlayerId/campaigns/:campaignId/events', addContentEvent);
app.get('/api/v1/players/:externalPlayerId/notifications', getPlayerNotifications);
app.get('/api/v1/players/:externalPlayerId/content-sent', getPlayerSentContent);

app.get('/api/v1/players/subscription-options', getPlayerSubscriptionOptions);
app.put('/api/v1/players/subscription-options', updatePlayerSubscriptionOptions);
app.post('/api/v1/players/subscription-options/snooze', snoozePlayerSubscription);

app.post('/api/v1/emails/external-send', sendEmailForExternalCampaign);
app.post('/api/v1/emails/direct-send', sendEmailDirectly);
app.post('/api/v1/smses/external-send', sendSmsForExternalCampaign);

app.get('/api/v1/content', getContentList);

app.use('/api/v1/swagger', createSwaggerRouter('./swagger/api-private.yaml'));
app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
