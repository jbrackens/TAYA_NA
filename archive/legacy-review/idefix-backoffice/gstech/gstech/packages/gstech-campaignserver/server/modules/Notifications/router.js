/* @flow */

const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();

router.get('/', routes.getNotifications);
router.get('/:contentId/preview', routes.getNotificationPreview);
router.get('/:contentfulId/preview-draft', routes.getNotificationDraftPreview);

module.exports = router;
