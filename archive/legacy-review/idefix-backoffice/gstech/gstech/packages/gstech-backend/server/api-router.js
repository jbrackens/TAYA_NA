/* @flow */
const { Router } = require('express');
const multer = require('multer');
const {
  apiRoutes: {
    registerPlayerHandler,
    balanceHandler,
    playerQueryHandler,
    changePasswordHandler,
    setPasswordHandler,
    getPlayerDetailsHandler,
    getFullPlayerDetailsHandler,
    updatePlayerDetailsHandler,
    requestActivationTokenHandler,
    activateAccountHandler,
    activateViaEmailVerificationHandler,
    requestPasswordResetCodeHandler,
    resetPasswordHandler,
    requestPasswordResetHandler,
    completePasswordResetHandler,
    requestPlayerRegistrationHandler,
    completePlayerRegistrationHandler,
    addPlayerNoteHandler,
    addPlayerTagHandler,
    removePlayerTagHandler,
  },
} = require('./modules/players');

const {
  apiRoutes: {
    failPartialLoginHandler,
    getPartialLoginHandler,
    startPartialLoginHandler,
    completePartialLoginHandler,
    registerPartialPlayerHandler,
    updatePartialPlayerHandler,
    completePartialPlayerHandler,
  },
} = require('./modules/partial');

const {
  apiRoutes: { getAffiliateRegistrationsReportHandler, getAffiliateActivitiesReportHandler },
} = require('./modules/affiliates');
const {
  apiRoutes: {
    loginHandler,
    mobileLoginHandler,
    requestLoginHandler,
    completeLoginHandler,
    requireAuthentication,
    logoutHandler,
    sessionStatisticsHandler,
  },
} = require('./modules/sessions');
const {
  apiRoutes: { languagesHandler, countriesHandler, currenciesHandler },
} = require('./modules/settings');
const {
  apiRoutes: {
    getDepositInfoHandler,
    getPnpEURDepositInfoHandler,
    startDepositHandler,
    getDepositHandler,
    updateDepositHandler,
    processDepositHandler,
    setDepositStatusHandler,
    executeDepositHandler,
    queryForPaymentsHandler
  },
} = require('./modules/payments');
const {
  apiRoutes: {
    createDepositWageringRequirementHandler,
    adjustDepositWageringRequirementHandler,
    setWithdrawalStatusHandler,
    getWithdrawalStatusHandler,
    getWithdrawalInfoHandler,
    requestWithdrawalHandler,
    getPendingWithdrawalsHandler,
    cancelPendingWithdrawalHandler,
    getWithdrawalDetailsHandler,
  },
} = require('./modules/payments');  
const {
  apiRoutes: {
    accountMonthlyStatementHandler,
    accountStatementHandler,
    accountDepositsHandler,
    createTransactionHandler,
    getConversionRatesHandler,
  },
} = require('./modules/payments');
const {
  apiRoutes: {
    getAccountHandler,
    updateAccountHolderHandler,
    updateAccountParametersHandler,
    addAccountHandler,
  },
} = require('./modules/accounts');
const {
  apiRoutes: { getExclusionsHandler, createExclusionHandler, cancelExclusionHandler },
} = require('./modules/limits');
const {
  apiRoutes: {
    returnGamesHandler,
    getGameByGameIdHandler,
    launchGameHandler,
    launchDemoGameHandler,
    getTopGamesHandler,
    creditGameFreeSpinsHandler,
    getJackpotsHandler,
    getLeaderBoardHandler,
    pingHandler,
  },
} = require('./modules/games');  
const {
  apiRoutes: { addPlayerFraudHandler, addPlayerFraudByUsernameHandler },
} = require('./modules/frauds');
const {
  apiRoutes: { healthCheckHandler },
} = require('./modules/health');
const {
  apiRoutes: { getPromotionsHandler, activatePromotionHandler, getPromotionLeaderboardHandler },
} = require('./modules/promotions');
const {
  apiRoutes: { creditBonusHandler, giveBonusHandler },
} = require('./modules/bonuses');
const {
  apiRoutes: { uploadDocumentHandler, createDocumentHandler, identifyHandler },
} = require('./modules/kyc');
const {
  apiRoutes: {
    getUnansweredQuestionnairesHandler,
    answerQuestionnaireHandler,
    getRequiredQuestionnairesHandler,
  },
} = require('./modules/questionnaires');
const {
  getGameManufacturersHandler,
  getGameManufacturerHandler,
} = require('./modules/game-manufacturers/routes');
const { requireAuthenticationToken } = require('./api-authentication');

const router: express$Router<> = Router({ mergeParams: true });  
const upload = multer({ storage: multer.memoryStorage() });

router.get('/status', healthCheckHandler);

router.all('*', requireAuthenticationToken);

router.get('/partial/login/:transactionKey/:status?', getPartialLoginHandler);
router.post('/partial/login', startPartialLoginHandler);
router.post('/partial/login/:transactionKey', completePartialLoginHandler);
router.delete('/partial/login/:transactionKey', failPartialLoginHandler);
router.post('/partial/player', registerPartialPlayerHandler);
router.post('/partial/player/:playerId', completePartialPlayerHandler);
router.put('/partial/player/:playerId', updatePartialPlayerHandler);

router.get('/languages', languagesHandler);
router.get('/countries', countriesHandler);
router.get('/currencies', currenciesHandler);
router.get('/currencies/rates', getConversionRatesHandler);
router.post('/players', registerPlayerHandler);
router.get('/players', playerQueryHandler);
router.post('/login', loginHandler);
router.post('/login/mobile', mobileLoginHandler);
router.post('/login/request', requestLoginHandler);
router.post('/login/complete', completeLoginHandler);
router.get('/deposit/:transactionKey', getDepositHandler);
router.put('/deposit/:transactionKey', updateDepositHandler);
router.post('/deposit/:transactionKey', processDepositHandler);
router.post('/deposit/:transactionKey/wager', adjustDepositWageringRequirementHandler);
router.put('/deposit/:transactionKey/wager', createDepositWageringRequirementHandler);
router.post('/deposit/:transactionKey/:status', setDepositStatusHandler);
router.get('/withdrawal/:transactionKey/details', getWithdrawalDetailsHandler);
router.post('/query/payments', queryForPaymentsHandler);
router.delete('/exclusions/:exclusionKey', cancelExclusionHandler);
router.post('/activate/:activationCode', activateAccountHandler);
router.post('/activate', activateViaEmailVerificationHandler);
router.post('/reset-password', requestPasswordResetCodeHandler);
router.post('/reset-password/:passwordResetCode', resetPasswordHandler);
router.post('/password/reset/request', requestPasswordResetHandler);
router.post('/password/reset/complete', completePasswordResetHandler);
router.post('/register/request', requestPlayerRegistrationHandler);
router.post('/register/complete', completePlayerRegistrationHandler);
router.get('/game', returnGamesHandler);
router.get('/game/:gameId', getGameByGameIdHandler);
router.post('/game/:gameId/demo', launchDemoGameHandler);
router.post('/report-fraud', addPlayerFraudByUsernameHandler);
router.get('/promotions/:id', getPromotionLeaderboardHandler);
router.get('/getjackpots', getJackpotsHandler);
router.get('/getleaderboard/:manufacturerId/:achievement', getLeaderBoardHandler);
router.post('/ping/:manufacturerId', pingHandler);
router.post('/accounts/:accountId/holder', updateAccountHolderHandler);
router.put('/accounts/:accountId/parameters', updateAccountParametersHandler);
router.post('/player/:playerId/accounts', addAccountHandler);
router.put('/reports/registrations/', getAffiliateRegistrationsReportHandler);
router.put('/reports/activities/', getAffiliateActivitiesReportHandler);
router.get('/game-manufacturers', getGameManufacturersHandler);
router.get('/game-manufacturers/:gameManufacturerId', getGameManufacturerHandler);
router.get('/pnpdeposit', getPnpEURDepositInfoHandler);

router.all('*', requireAuthentication);

router.post('/logout', logoutHandler);
router.post('/password', changePasswordHandler);
router.post('/password/set', setPasswordHandler);
router.get('/session', sessionStatisticsHandler);
router.get('/details', getPlayerDetailsHandler);
router.get('/details/full', getFullPlayerDetailsHandler);
router.post('/details', updatePlayerDetailsHandler);
router.get('/balance', balanceHandler);
router.get('/statement', accountStatementHandler);
router.get('/statement/:month', accountMonthlyStatementHandler);
router.get('/deposits', accountDepositsHandler);
router.get('/deposit', getDepositInfoHandler);
router.post('/deposit', startDepositHandler);
router.post('/executedeposit', executeDepositHandler);
router.post('/identify', identifyHandler);
router.get('/withdrawal', getWithdrawalInfoHandler);
router.post('/withdrawal', requestWithdrawalHandler);
router.get('/withdrawal/pending', getPendingWithdrawalsHandler);
router.get('/withdrawal/:transactionKey', getWithdrawalStatusHandler);
router.post('/withdrawal/:transactionKey/:status', setWithdrawalStatusHandler);
router.delete('/withdrawal/pending/:transactionKey', cancelPendingWithdrawalHandler);
router.get('/exclusions', getExclusionsHandler);
router.get('/promotions', getPromotionsHandler);
router.get('/questionnaires', getUnansweredQuestionnairesHandler);
router.get('/questionnaires/required', getRequiredQuestionnairesHandler);
router.post('/questionnaires/:id', answerQuestionnaireHandler);
router.get('/accounts/:accountId', getAccountHandler);
router.post('/upload', upload.single('photo'), uploadDocumentHandler);
router.post('/documents', createDocumentHandler);
router.post('/promotions/:id', activatePromotionHandler);
router.post('/exclusions', createExclusionHandler);
router.post('/transaction', createTransactionHandler);
router.post('/game/:gameId', launchGameHandler);
router.post('/fraud', addPlayerFraudHandler);
router.post('/bonuses/:bonusCode/credit', creditBonusHandler);
router.post('/bonuses/:bonusCode/give', giveBonusHandler);
router.get('/games/top', getTopGamesHandler);
router.post('/notes', addPlayerNoteHandler);
router.get('/activate', requestActivationTokenHandler);
router.post('/creditfreespins', creditGameFreeSpinsHandler);
router.post('/tags', addPlayerTagHandler);
router.delete('/tags/:tag', removePlayerTagHandler);

module.exports = router;
