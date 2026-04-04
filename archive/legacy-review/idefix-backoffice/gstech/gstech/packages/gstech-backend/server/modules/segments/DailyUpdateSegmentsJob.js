/* @flow */
const { dailyUpdateSegmentsHandler } = require('./Segment');

const update = async () => {
  await dailyUpdateSegmentsHandler();
};

module.exports = { update };