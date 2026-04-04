/* @flow */
const { lock, release, steal } = require('./Lock');
const routes = require('./routes');

module.exports = {
  lock,
  release,
  steal,
  routes: {
    getLocksHandler: routes.get,
    lockPlayerHandler: routes.lock,
    releasePlayerHandler: routes.release,
    stealPlayerHandler: routes.steal,
  },
};
