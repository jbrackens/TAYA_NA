/* @flow */

const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();

router.get('/', routes.getEmails);
router.get('/:contentId/preview', routes.getEmailPreview);
router.get('/:contentfulId/preview-draft', routes.getEmailDraftPreview);

module.exports = router;
