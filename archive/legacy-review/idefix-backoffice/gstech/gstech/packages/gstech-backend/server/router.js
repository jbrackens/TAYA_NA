/* @flow */
const { Router } = require('express');
const multer = require('multer');
const requestIp = require('request-ip');
const _ = require('lodash');
const { getPhotoHandler, uploadPhotoHandler, removePhotoHandler } = require('./modules/photos');
const { routes: {
  getPlayerHandler,
  suspendPlayerHandler,
  getPlayersHandler,
  updatePlayerHandler,
  searchPlayerHandler,
  getFinancialInfoHandler,
  getRegistrationInfoHandler,
  getAccountStatusHandler,
  updateAccountStatusHandler,
  getEventsHandler,
  getNotesHandler,
  addNoteHandler,
  getPlayerStickyNoteHandler,
  setPlayerStickyNoteHandler,
  getStatusHandler,
  addPlayerTagHandler,
  removePlayerTagHandler,
  getPlayerTagsHandler,
  usernameToIdMappingHandler,
  getPlayersWithClosedAccountsHandler,
  archiveNoteHandler,
  registerPlayerWithGamblingProblemHandler,
} } = require('./modules/players');
const { routes: { getTransactionDatesHandler, getTransactionsHandler, getTransactionSummaryHandler } } = require('./modules/transactions');
const { routes: {
  getAccountsHandler,
  addAccountHandler,
  updateAccountHandler,
  updateAccountDocumentHandler,
  addAccountDocumentHandler,
  removeAccountDocumentHandler,
} } = require('./modules/accounts');
const {
  routes: {
    getSegmentsHandler,
  }
} = require('./modules/segments');
const { routes: {
  getPaymentsHandler,
  getPaymentEventsHandler,
  cancelPlayerPendingWithdrawalHandler,
  addPaymentTransactionHandler,
  getWithdrawalInfoHandler,
  getWithdrawalHandler,
  getWithdrawalEventsHandler,
  acceptWithdrawalHandler,
  confirmWithdrawalHandler,
  acceptWithdrawalWithDelayHandler,
  updateDepositWageringRequirementHandler,
  completeDepositHandler,
} } = require('./modules/payments');
const { routes: { getLocksHandler, lockPlayerHandler, releasePlayerHandler, stealPlayerHandler } } = require('./modules/locks');
const { routes: {
  getKycDocumentsHandler,
  getKycDocumentHandler,
  createKycDocumentsHandler,
  createKycContentDocumentHandler,
  verifyKycDocumentsHandler,
  updateKycDocumentHandler,
  updateKycDocumentPhotoHandler,
  createKycDocumentRequestHandler,
  getKycDocumentRequestsHandler,
  declineKycDocumentsHandler,
} } = require('./modules/kyc');  
const { routes: { getSettingsHandler, getCountriesHandler, getCurrenciesHandler } } = require('./modules/settings');

const {
  access: {
    requireAuthentication,
    requireAdminAccess,
    requireReportingAccess,
    requireCampaignAccess,
  },
  routes: {
    loginUserHandler,
    logoutUserHandler,
    expirePasswordHandler,
    getUserHandler,
    getUsersHandler,
    getCurrentUserAccessSettingsHandler,
    getUserAccessSettingsHandler,
    updateUserAccessSettingsHandler,
    getUserLogHandler,
    createUserHandler,
    updateUserHandler,
    changePasswordHandler,
    sendVerificationCodeHandler,
    checkVerificationCodeHandler,
    resetPasswordHandler,
  },
} = require('./modules/users');
const { routes: { getActiveLimitsHandler, getLimitsHandler, setLimitHandler, cancelLimitHandler, raiseLimitHandler } } = require('./modules/limits');
const { routes: {
  liabilitiesReportHandler,
  activeUsersReportHandler,
  resultsReportHandler,
  gameTurnoverReportHandler,
  paymentReportHandler,
  paymentSummaryReportHandler,
  dormantPlayersReportHandler,
  withdrawReportHandler,
  pendingWithdrawReportHandler,
  playerRiskStatusReportHandler,
  playerRiskTransactionReportHandler,
  licenseReportHandler,
} } = require('./modules/reports');
const { routes: {
  getBonusesHandler,
  getBonusesAvailableHandler,
  getAvailableBonusesByBrandHandler,
  archiveBonusHandler,
  updateBonusHandler,
  createBonusHandler,
  getBonusLimitsHandler,
  getAvailableBonusLimitsHandler,
  updateBonusLimitsHandler,
  creditBonusHandler,
  forfeitBonusHandler,
} } = require('./modules/bonuses');
const { routes: { getPlayerFraudHandler, checkPlayerFraudHandler, createPlayerFraudHandler } } = require('./modules/frauds');
const { routes: {
  getPlayerRiskLevelHandler,
  getPlayerRiskStatusHandler,
  getPlayerRiskLogHandler,
  getRisksHandler,
  createRiskHandler,
  updateRiskHandler
} } = require('./modules/risks');
const { routes: { refundGameRoundHandler, closeGameRoundHandler } } = require('./modules/game_round');
const { routes: { getCountriesSettingsHandler, updateCountrySettingsHandler } } = require('./modules/countries');
const { routes: { healthCheckHandler } } = require('./modules/health');
const { routes: {
  getGamesSettingsHandler,
  createGameSettingsHandler,
  updateGameSettingsHandler,
  getBrandGameProfilesHandler,
  getAvailableGameProfilesHandler,
  updateGameProfilesHandler,
  getGameProfileSettingsHandler,
  updateGameProfileSettingsHandler,
  createGameProfileSettingsHandler,
} } = require('./modules/games');
const { routes: {
  getPaymentMethodHandler,
  getPaymentMethodsHandler,
  updatePaymentMethodHandler,
} } = require('./modules/payment-methods');
const { routes: {
  getPlayerPromotionsHandler,
  getPromotionsSettingsHandler,
  createPromotionSettingsHandler,
  updatePromotionSettingsHandler,
  createPromotionGameHandler,
  getPromotionGamesHandler,
  updatePromotionGamesHandler,
  archivePromotionHandler,
} } = require('./modules/promotions');
const { routes: { getPlayerAnswersHandler } } = require('./modules/questionnaires');
const { routes: { getConnectedPlayersHandler, connectPlayersWithPersonHandler, disconnectPlayerFromPersonHandler } } = require('./modules/persons');
const { routes: { getPaymentProviderDetailsHandler, updatePaymentProviderDetailsHandler } } = require('./modules/payment-providers');
const { routes: { getGameManufacturerHandler, getGameManufacturersHandler, updateGameManufacturerHandler } } = require('./modules/game-manufacturers');

const { routes: { getTicketHandler } } = require('./modules/tickets');

const router: express$Router<> = Router();  

const upload = multer({ storage: multer.memoryStorage() });

router.use(requestIp.mw());


// TODO: temporary method to debug IP address
const getRemoteAddress = (req: express$Request, ipv6: boolean = true): IPAddress => {
  const { headers } = req;
  if (headers != null) {
    let addr = headers['cf-connecting-ipv6'];
    if (ipv6 && addr != null) {
      return addr;
    }

    addr = headers['cf-connecting-ip'];
    if (addr != null) {
      return addr;
    }

    addr = headers['x-client-ip'];
    if (addr != null) {
      return addr;
    }

    addr = headers['x-forwarded-for'];
    if (addr != null) {
      return _.last(addr.split(','))
        .trim()
        .replace('::ffff:', '');
    }
  }
  // eslint-disable-next-line no-constant-condition
  if (req.connection != null && false) {
    // This shoould be used only in development environment
    if (req.connection.remoteAddress === '::1') {
      return '127.0.0.1';
    }
    return ((req.connection.remoteAddress: any): string).replace('::ffff:', '');
  }
  return '';
};

router.get('/api/ip-check', async (req: express$Request, res: express$Response, next: express$NextFunction) => {
    try {
      const ipAddress = getRemoteAddress(req, true);

     // logger.warn(`Your IP address is ${ipAddress}`);

      return res.send(`Your IP address is ${ipAddress}`);
    } catch (e) {
     //  logger.error('Unable to check IP address', e);
      return next(e);
    }
  });

router.get('/status', healthCheckHandler);
router.post('/login', loginUserHandler);
router.put('/users/:email/password', changePasswordHandler);
router.post('/users/password/reset', resetPasswordHandler);
router.get('/users/:email/password/reset/code', sendVerificationCodeHandler);
router.post('/users/password/reset/code', checkVerificationCodeHandler);
router.get('/photos/:photoId', getPhotoHandler);
router.get('/player/go/:brandId/:username', usernameToIdMappingHandler);
router.all('*', requireAuthentication);

router.post('/logout', logoutUserHandler);
router.post('/expire-password', expirePasswordHandler);

router.get('/settings', getSettingsHandler);
router.get('/settings/payment-methods', getPaymentMethodsHandler);
router.get('/settings/payment-methods/:paymentMethodId', getPaymentMethodHandler);
router.put('/settings/payment-methods/:paymentMethodId', updatePaymentMethodHandler);
router.get('/settings/payment-providers/:paymentProviderId', getPaymentProviderDetailsHandler);
router.put('/settings/payment-providers/:paymentProviderId', updatePaymentProviderDetailsHandler);

router.get('/player/:playerId', getPlayerHandler);
router.delete('/player/:playerId', suspendPlayerHandler);
router.get('/player', getPlayersHandler);
router.post('/player/gamblingproblem', registerPlayerWithGamblingProblemHandler);
router.get('/player/:playerId/financial-info', getFinancialInfoHandler);
router.get('/player/:playerId/registration-info', getRegistrationInfoHandler);
router.put('/player/:playerId', updatePlayerHandler);
router.post('/player/search/:tab', searchPlayerHandler);

router.get('/player/:playerId/account-status', getAccountStatusHandler);
router.put('/player/:playerId/account-status', updateAccountStatusHandler);
router.get('/player/:playerId/active-limits', getActiveLimitsHandler);
router.get('/player/:playerId/limits', getLimitsHandler);
router.get('/player/:playerId/limits/closed-accounts', getPlayersWithClosedAccountsHandler);
router.post('/player/:playerId/limits', setLimitHandler);
router.post('/player/:playerId/limits/:limitId', raiseLimitHandler);
router.delete('/limits/:exclusionKey', cancelLimitHandler);
router.get('/player/:playerId/status', getStatusHandler);
router.get('/player/:playerId/events', getEventsHandler);
router.get('/player/:playerId/notes', getNotesHandler);
router.post('/player/:playerId/notes', addNoteHandler);
router.put('/player/:playerId/notes/:noteId/archive', archiveNoteHandler);
router.get('/player/:playerId/tags', getPlayerTagsHandler);
router.post('/player/:playerId/tags', addPlayerTagHandler);
router.delete('/player/:playerId/tags/:tag', removePlayerTagHandler);
router.get('/player/:playerId/notes/sticky', getPlayerStickyNoteHandler);
router.post('/player/:playerId/notes/sticky', setPlayerStickyNoteHandler);

router.get('/player/:playerId/transactions', getTransactionsHandler);
router.post('/player/:playerId/transactions', addPaymentTransactionHandler);
router.get('/player/:playerId/transaction-dates', getTransactionDatesHandler);
router.post('/player/:playerId/transactions/:transactionKey/complete', completeDepositHandler);

router.get('/player/:playerId/payments', getPaymentsHandler);
router.get('/player/:playerId/payments/:paymentId/events', getPaymentEventsHandler);
router.delete('/player/:playerId/payment-transactions', cancelPlayerPendingWithdrawalHandler);
router.get('/player/:playerId/accounts', getAccountsHandler);
router.post('/player/:playerId/accounts', addAccountHandler);
router.put('/player/:playerId/accounts/:accountId', updateAccountHandler);
router.put('/player/:playerId/counters/:counterId', updateDepositWageringRequirementHandler);
router.put('/player/:playerId/accounts/:accountId/documents/:documentId', updateAccountDocumentHandler);
router.post('/player/:playerId/accounts/:accountId/documents/', addAccountDocumentHandler);
router.delete('/player/:playerId/accounts/:accountId/documents/:documentId', removeAccountDocumentHandler);

router.get('/withdrawals/:withdrawalId', getWithdrawalHandler); // FIXME move under /player
router.get('/withdrawals/:withdrawalId/events', getWithdrawalEventsHandler); // FIXME move under /player
router.get('/player/:playerId/withdrawals', getWithdrawalInfoHandler); // FIXME move under /player
router.put('/player/:playerId/withdrawals/:withdrawalId', acceptWithdrawalHandler); // FIXME move under /player
router.put('/player/:playerId/withdrawals/:withdrawalId/confirm', confirmWithdrawalHandler); // FIXME move under /player
router.put('/player/:playerId/withdrawals/:withdrawalId/delay', acceptWithdrawalWithDelayHandler); // FIXME move under /player

router.get('/player/:playerId/segments', getSegmentsHandler);

router.get('/player/:playerId/bonuses', getBonusesHandler);
router.get('/player/:playerId/bonuses/available', getBonusesAvailableHandler);
router.post('/player/:playerId/bonuses', creditBonusHandler);
router.delete('/player/:playerId/bonuses/:bonusId', forfeitBonusHandler);

router.get('/player/:playerId/frauds/:playerFraudId', getPlayerFraudHandler);
router.put('/player/:playerId/frauds/:playerFraudId', checkPlayerFraudHandler);
router.post('/player/:playerId/frauds', createPlayerFraudHandler);

router.get('/player/:playerId/risks', getPlayerRiskLevelHandler);
router.get('/player/:playerId/risks/:riskType', getPlayerRiskStatusHandler);
router.get('/player/:playerId/risks/:riskType/log', getPlayerRiskLogHandler);

router.get('/player/:playerId/kyc/request', getKycDocumentRequestsHandler);
router.post('/player/:playerId/kyc/request', createKycDocumentRequestHandler);
router.get('/player/:playerId/kyc/:kycDocumentId', getKycDocumentHandler);
router.put('/player/:playerId/kyc/:kycDocumentId', updateKycDocumentHandler);
router.put('/player/:playerId/kyc/:kycDocumentId/verify', verifyKycDocumentsHandler);
router.delete('/player/:playerId/kyc/:kycDocumentId', declineKycDocumentsHandler);
router.get('/player/:playerId/kyc', getKycDocumentsHandler);
router.post('/player/:playerId/kyc', createKycDocumentsHandler);
router.post('/player/:playerId/kyc/content', createKycContentDocumentHandler);
router.put('/player/:playerId/kyc/photo/:kycDocumentId', updateKycDocumentPhotoHandler);

router.get('/player/:playerId/games-summary', getTransactionSummaryHandler);

router.get('/player/:playerId/questionnaires', getPlayerAnswersHandler);

router.get('/promotions/:brandId', getPromotionsSettingsHandler);
router.post('/promotions', createPromotionSettingsHandler);
router.put('/promotions/:promotionId', updatePromotionSettingsHandler);
router.put('/promotions/:promotionId/archive', archivePromotionHandler);
router.get('/promotion-games/:promotionId', getPromotionGamesHandler);
router.put('/promotion-games/:promotionId', updatePromotionGamesHandler);
router.post('/promotion-games', createPromotionGameHandler);
router.get('/player/:playerId/promotions', getPlayerPromotionsHandler);

router.get('/bonuses/:brandId', getAvailableBonusesByBrandHandler);
router.put('/bonuses/:bonusId', updateBonusHandler);
router.post('/bonuses', createBonusHandler);
router.put('/bonuses/:bonusId/archive', archiveBonusHandler);
router.get('/bonuses/:bonusId/limits', getBonusLimitsHandler);
router.put('/bonuses/:bonusId/limits', updateBonusLimitsHandler);
router.get('/brands/:brandId/limits', getAvailableBonusLimitsHandler);
router.put('/game-rounds/:roundId', refundGameRoundHandler); // FIXME move under /player
router.delete('/game-rounds/:roundId', closeGameRoundHandler); // FIXME move under /player

router.get('/locks', getLocksHandler);
router.put('/locks/:playerId/steal', stealPlayerHandler);
router.put('/locks/:playerId', lockPlayerHandler);
router.delete('/locks/:playerId', releasePlayerHandler);

router.post('/photos', upload.single('photo'), uploadPhotoHandler);
router.delete('/photos/:photoId', removePhotoHandler);

router.get('/campaigns/currencies/:brandId', requireCampaignAccess, getCurrenciesHandler);

router.post('/reports/liabilities', requireReportingAccess, liabilitiesReportHandler);
router.post('/reports/users', requireReportingAccess, activeUsersReportHandler);
router.post('/reports/results', requireReportingAccess, resultsReportHandler);
router.post('/reports/game-turnover', requireReportingAccess, gameTurnoverReportHandler);
router.post('/reports/deposits', requireReportingAccess, paymentReportHandler('deposit'));
router.post('/reports/withdrawals', requireReportingAccess, withdrawReportHandler);
router.post('/reports/pending-withdrawals', requireReportingAccess, pendingWithdrawReportHandler);
router.post('/reports/deposits-summary', requireReportingAccess, paymentSummaryReportHandler('deposit'));
router.post('/reports/withdrawals-summary', requireReportingAccess, paymentSummaryReportHandler('withdraw'));
router.post('/reports/dormant', requireReportingAccess, dormantPlayersReportHandler);
router.post('/reports/risk-status', requireReportingAccess, playerRiskStatusReportHandler);
router.post('/reports/risk-transaction', requireReportingAccess, playerRiskTransactionReportHandler);
router.post('/reports/license', requireReportingAccess, licenseReportHandler);

router.get('/users/access-settings', getCurrentUserAccessSettingsHandler);

router.get('/users', requireAdminAccess, getUsersHandler);
router.post('/users', requireAdminAccess, createUserHandler);
router.get('/users/:userId', requireAdminAccess, getUserHandler);
router.put('/users/:userId', requireAdminAccess, updateUserHandler);
router.get('/users/:userId/access-settings', requireAdminAccess, getUserAccessSettingsHandler);
router.post('/users/:userId/access-settings', requireAdminAccess, updateUserAccessSettingsHandler);
router.get('/users/:userId/log', requireAdminAccess, getUserLogHandler);

router.get('/countries', getCountriesHandler);
router.get('/countries/:brandId', getCountriesSettingsHandler);
router.put('/countries/:brandId/:countryId', updateCountrySettingsHandler);

router.get('/games', getGamesSettingsHandler);
router.post('/games', createGameSettingsHandler);
router.put('/games/:gameId', updateGameSettingsHandler);
router.get('/games/:gameId/profiles', getBrandGameProfilesHandler);
router.put('/games/:gameId/profiles', updateGameProfilesHandler);
router.get('/games/profiles', getAvailableGameProfilesHandler);

router.get('/game-manufacturers', getGameManufacturersHandler);
router.get('/game-manufacturers/:gameManufacturerId', getGameManufacturerHandler);
router.put('/game-manufacturers/:gameManufacturerId', updateGameManufacturerHandler);

router.get('/game-profiles/:brandId', getGameProfileSettingsHandler);
router.post('/game-profiles', createGameProfileSettingsHandler);
router.put('/game-profiles/:gameProfileId', updateGameProfileSettingsHandler);

router.get('/risks', getRisksHandler);
router.post('/risks', createRiskHandler);
router.put('/risks/:riskId', updateRiskHandler);

router.get('/player/:playerId/persons', getConnectedPlayersHandler);
router.post('/player/:playerId/persons', connectPlayersWithPersonHandler);
router.delete('/player/:playerId/persons', disconnectPlayerFromPersonHandler);

router.get('/tickets/:externalTicketId', getTicketHandler);

module.exports = router;
