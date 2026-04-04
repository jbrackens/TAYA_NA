/* @flow */
const logger = require('../logger');

const unhandledRejections = () => {
  process.on('unhandledRejection', reason => logger.error('Unhandled Rejection:', reason));
};

const uncaughtExceptions = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

module.exports = {
  unhandledRejections,
  uncaughtExceptions,
};
