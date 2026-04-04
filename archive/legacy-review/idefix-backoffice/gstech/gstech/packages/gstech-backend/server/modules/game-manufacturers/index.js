/* @flow */

const {
  getGameManufacturerHandler,
  getGameManufacturersHandler,
  updateGameManufacturerHandler,
} = require('./routes');

module.exports = {
  routes: {
    getGameManufacturerHandler,
    getGameManufacturersHandler,
    updateGameManufacturerHandler,
  },
};
