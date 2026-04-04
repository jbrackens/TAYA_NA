/* @flow */
const { Router } = require('express');
const multer = require('multer');
const routes = require('./routes');

const upload = multer({ storage: multer.memoryStorage() });
const router: express$Router<> = Router({ mergeParams: true });  

router.post('/', upload.array('file', 10), routes.createAffiliateLogHandler);
router.get('/', routes.getAffiliateLogsHandler);

module.exports = router;
