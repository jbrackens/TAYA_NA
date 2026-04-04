/* @flow */

const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();

router.get('/init', routes.initContent);

router.get('/localizations', routes.getLocalizations);
router.post('/localizations', routes.createLocalization);

router.get('/', routes.getContentList);
router.post('/', routes.createContent);
router.get('/:contentId', routes.getContent);
router.put('/:contentId', routes.updateContent);
router.delete('/:contentId', routes.deleteContent);

module.exports = router;
