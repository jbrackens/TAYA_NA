/* @flow */

const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router();

router.get('/:playerId/content', routes.getPlayerAvailableContent);

module.exports = router;
