/* @flow */
const logger = require('../logger');

const unhandledRejections = () => {
  process.on('unhandledRejection', (r) => logger.error('X?X UNHANDLED REJECTION', { r }));
};

const uncaughtExceptions = () => {
  process.on('uncaughtException', (error) => {
    logger.error('X?X UNCAUGHT EXCEPTION', { error });
    process.exit(1);
  });
};

module.exports = {
  unhandledRejections,
  uncaughtExceptions,
};
