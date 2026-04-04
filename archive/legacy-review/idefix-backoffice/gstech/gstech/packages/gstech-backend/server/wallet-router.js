/* @flow */
const { Router } = require('express');
const { walletRoutes: { playerDetailsHandler, playerBalanceHandler, playerBySessionHandler, createManufacturerSessionHandler, createNewManufacturerSessionHandler, updateManufacturerSessionHandler, getPlayerByUsernameHandler, destroyManufacturerSessionHandler } } = require('./modules/players');  
const { walletRoutes: { placeBetHandler, processWinHandler, cancelTransactionHandler, closeRoundHandler, getTransactionHandler, getRoundTransactionsHandler } } = require('./modules/game_round');
const { walletRoutes: { createOrUpdateTicketHandler } } = require('./modules/tickets');

const router: express$Router<> = Router({ mergeParams: true });  

router.get('/session/:manufacturerId/:sessionId', playerBySessionHandler);
router.put('/session/:manufacturerId/:sessionId', updateManufacturerSessionHandler);
router.post('/session/:manufacturerId/:type', createManufacturerSessionHandler);
router.post('/session/:manufacturerId/:sessionId/:type', createNewManufacturerSessionHandler);
router.delete('/session/:manufacturerId/:sessionId', destroyManufacturerSessionHandler);
router.get('/player/id/:brandId/:username', getPlayerByUsernameHandler);
router.get('/player/:playerId', playerDetailsHandler);
router.get('/player/:playerId/balance', playerBalanceHandler);
router.post('/player/:playerId/bet', placeBetHandler);
router.post('/player/:playerId/win', processWinHandler);
router.post('/player/:playerId/close', closeRoundHandler);
router.delete('/player/:playerId/transactions', cancelTransactionHandler);
router.get('/player/:playerId/transactions', getTransactionHandler);
router.get('/player/:playerId/round', getRoundTransactionsHandler);
router.put('/ticket', createOrUpdateTicketHandler);

module.exports = router;
