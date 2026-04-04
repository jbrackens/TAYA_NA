/* @flow */
const { Router } = require('express');
const bodyParser = require('body-parser');

const { verifyToken, getBalance, bet, win, rollback, cancelFreeSpins } = require('./routes');

const router: express$Router<> = Router();  

router.use(bodyParser.json());

router.post('/verifyToken', verifyToken);
router.post('/getBalance', getBalance);
router.post('/withdraw', bet);
router.post('/deposit', win);
router.post('/rollback', rollback);
router.post('/notifyFreespinsCancel', cancelFreeSpins);

module.exports = router;
