/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');
const { process } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.json());
router.get('/', process);

module.exports = router;
