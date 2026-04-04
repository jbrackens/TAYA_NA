/* @flow */
const { updatePlayerSegments, getPlayerSegments } = require('./Segment');
const { getSegmentsHandler } = require('./routes');

module.exports = {
  updatePlayerSegments,
  getPlayerSegments,
  routes: {
    getSegmentsHandler,
  }
};
