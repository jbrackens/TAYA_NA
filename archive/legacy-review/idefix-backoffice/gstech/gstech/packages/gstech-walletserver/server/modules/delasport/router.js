/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');

const config = require('gstech-core/modules/config');

const routes = require('./routes');


const router: express$Router<> = Router();  

router.use(bodyParser.urlencoded({ extended: false }))

if(!config.isProduction) {
  router.post('/test-hash', routes.testHash);
}

router.post('/member-details', routes.memberDetails);
router.get('/balance', routes.balance);
router.post('/bet-placed', routes.betPlaced);
router.post('/bet-updated', routes.betUpdated);
router.post('/balance-updated', routes.balanceUpdated);

module.exports = router;
