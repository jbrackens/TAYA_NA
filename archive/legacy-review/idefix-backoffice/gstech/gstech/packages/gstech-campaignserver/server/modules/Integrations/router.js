/* @flow */

const { Router } = require('express');
const bodyParser = require('body-parser');

const routes = require('./routes');

const router: express$Router<> = Router();

router.post('/sendgrid', routes.emailReportHandler);
router.post('/:brandId/contentful', bodyParser.json({ type: 'application/*+json', limit: '5mb' }), routes.contentfulWebhookHandler);

module.exports = router;
