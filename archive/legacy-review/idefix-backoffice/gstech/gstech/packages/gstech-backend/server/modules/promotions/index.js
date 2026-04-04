/* @flow */
const { activatePromotionHandler, getPromotionsHandler, getPromotionLeaderboardHandler } = require('./api-routes');
const { getPlayerPromotionsHandler, getPromotionsSettings, createPromotionSettings, updatePromotionSettings, createPromotionGame, getPromotionGames, updatePromotionGames, archivePromotion } = require('./routes');
const { setupPromotions, getPlayerPromotions, getActivePromotions } = require('./Promotion');

module.exports = {
  setupPromotions,
  getPromotions: getPlayerPromotions,
  getActivePromotions,
  apiRoutes: { activatePromotionHandler, getPromotionsHandler, getPromotionLeaderboardHandler },
  routes: {
    getPlayerPromotionsHandler,
    getPromotionsSettingsHandler: getPromotionsSettings,
    createPromotionSettingsHandler: createPromotionSettings,
    updatePromotionSettingsHandler: updatePromotionSettings,
    createPromotionGameHandler: createPromotionGame,
    getPromotionGamesHandler: getPromotionGames,
    updatePromotionGamesHandler: updatePromotionGames,
    archivePromotionHandler: archivePromotion,
  },
};
