/* @flow */
const {
  launchGameHandler,
  launchDemoGameHandler,
  returnGamesHandler,
  getGameByGameIdHandler,
  getTopGamesHandler,
  creditGameFreeSpinsHandler,
  getJackpotsHandler,
  getLeaderBoardHandler,
  pingHandler,
} = require('./api-routes');
const { get, launchGame, getWithProfile, getByGameId, getByGameIdWithProfile } = require('./Game');
const {
  getGamesSettings,
  createGameSettings,
  updateGameSettings,
  getBrandGameProfiles,
  getAvailableGameProfiles,
  updateGameProfiles,
  getGameProfileSettings,
  updateGameProfileSettings,
  createGameProfileSettings,
} = require('./routes');

module.exports = {
  get,
  getWithProfile,
  getByGameId,
  getByGameIdWithProfile,
  launchGame,
  apiRoutes: {
    launchGameHandler,
    launchDemoGameHandler,
    returnGamesHandler,
    getGameByGameIdHandler,
    getTopGamesHandler,
    creditGameFreeSpinsHandler,
    getJackpotsHandler,
    getLeaderBoardHandler,
    pingHandler,
  },
  routes: {
    getGamesSettingsHandler: getGamesSettings,
    createGameSettingsHandler: createGameSettings,
    updateGameSettingsHandler: updateGameSettings,
    getBrandGameProfilesHandler: getBrandGameProfiles,
    getAvailableGameProfilesHandler: getAvailableGameProfiles,
    updateGameProfilesHandler: updateGameProfiles,
    getGameProfileSettingsHandler: getGameProfileSettings,
    updateGameProfileSettingsHandler: updateGameProfileSettings,
    createGameProfileSettingsHandler: createGameProfileSettings,
  },
};
