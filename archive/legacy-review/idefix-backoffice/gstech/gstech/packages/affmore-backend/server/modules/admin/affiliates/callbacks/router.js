/* @flow */
const { Router } = require('express');

const routes = require('./routes');

const router: express$Router<> = Router({ mergeParams: true });  

router.post('/', routes.createCallbackHandler);
router.get('/', routes.getCallbacksHandler);
router.put('/:callbackId', routes.updateCallbackHandler);
router.delete('/:callbackId', routes.deleteCallbackHandler);

module.exports = router;
