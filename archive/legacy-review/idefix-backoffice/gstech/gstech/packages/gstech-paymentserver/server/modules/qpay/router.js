/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const logger = require('gstech-core/modules/logger');
const routes = require('./routes');

const router: express$Router<> = Router();

router.use((req: express$Request, res: express$Response, next: express$NextFunction) => {
  logger.debug('QPay callback', req.body, req.headers, req.query);
  next();
});
router.use(bodyParser.json());
router.post('/:payload', routes.handler);

module.exports = router;
