/* @flow */

const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();

router.get('/', routes.getSmses);
router.get('/:contentId/preview', routes.getSmsPreview);
router.get('/:contentfulId/preview-draft', routes.getSmsDraftPreview);

module.exports = router;
