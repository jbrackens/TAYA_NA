/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const { processors } = require('xml2js');
const logger = require('gstech-core/modules/logger');
const WalletServer = require('./WalletServer');
require('body-parser-xml')(bodyParser);

const router: express$Router<> = Router();  
router.use(bodyParser.text({ type: '*/*' }));

router.use((req: express$Request, res: express$Response, next: express$NextFunction) => {
  logger.debug('PlaynGo req', req.body);
  next();
});

router.use(bodyParser.xml({
  xmlParseOptions: {
    normalize: true,
    tagNameProcessors: [processors.stripPrefix],
    explicitArray: false,
  },
}));

router.get('/ping', (req: express$Request, res: express$Response) => res.json({ ok: true }));
router.use('/', WalletServer);
module.exports = router;
