/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const { processors } = require('xml2js');
const WalletServer = require('./WalletServer');
require('body-parser-xml')(bodyParser);

const router: express$Router<> = Router();  
router.use(bodyParser.xml({
  xmlParseOptions: {
    normalize: true,
    tagNameProcessors: [processors.stripPrefix],
  },
}));

router.get('/ping', (req: express$Request, res: express$Response) => res.json({ ok: true }));
router.post('/NetEntService.svc', WalletServer);
router.post('/bit8_wcf_router.svc', WalletServer);
router.post('/router', WalletServer);
module.exports = router;
