/* @flow */
const {
  failPartialLoginHandler,
  getPartialLoginHandler,
  startPartialLoginHandler,
  completePartialLoginHandler,
  registerPartialPlayerHandler,
  updatePartialPlayerHandler,
  completePartialPlayerHandler,
} = require('./api-routes');

const { testPartialLoginHandler } = require('./test-routes');

module.exports = {
  apiRoutes: {
    failPartialLoginHandler,
    getPartialLoginHandler,
    startPartialLoginHandler,
    completePartialLoginHandler,
    registerPartialPlayerHandler,
    updatePartialPlayerHandler,
    completePartialPlayerHandler,
  },
  testRoutes: {
    testPartialLoginHandler,
  },
};
