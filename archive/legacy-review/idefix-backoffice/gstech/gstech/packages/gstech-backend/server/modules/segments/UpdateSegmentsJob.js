/* @flow */
const { updateSegments } = require('./Segment');

const update = async () => {
  await updateSegments();
};

module.exports = { update };
