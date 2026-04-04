/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);

const { handler } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.xml({
  xmlParseOptions: {
    normalize: true,
    explicitArray: false,
  },
}));
router.post('/', handler);

module.exports = router;
