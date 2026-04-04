/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');


const { ping, identify, betMake, betCommit, betSettlement, betRefund, betWin, betLost, betDiscard, betRollback } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.json());

router.get('/ping', ping);
router.get('/identify', identify);
//
router.post('/bet/make', betMake);
router.post('/bet/commit', betCommit);
router.post('/bet/settlement', betSettlement);
router.post('/bet/refund', betRefund);
router.post('/bet/win', betWin);
router.post('/bet/lost', betLost);
router.post('/bet/discard', betDiscard);
router.post('/bet/rollback', betRollback);

module.exports = router;
