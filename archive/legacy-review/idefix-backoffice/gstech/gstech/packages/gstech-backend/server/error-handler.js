// @flow
const { isBoom } = require('@hapi/boom');
const logger = require('gstech-core/modules/logger');

module.exports = (err: any, req: express$Request, res: express$Response, next: express$NextFunction): express$Response => { // eslint-disable-line no-unused-vars
  if (isBoom(err)) {
    if (err.data) {
      const status = err.output.statusCode;
      const response = { ...err.output.payload, ...err.data };
      return res.status(status).json(response);
    }
    return res.status(err.output.statusCode).json(err.output.payload);
  }

  if (err == null || err.error == null) {
    logger.error('Internal server error', err);
  } else {
    logger.info('Returning error status', err);
  }

  const response = {
    message: err.constraint != null ? `Invalid data: ${err.constraint}` : err.message,
    code: err.code,
    error: { message: err.error ? err.error.message : err.message, code: err.error ? err.error.code : err.code },
    errors: err.errors,
    constraint: err.constraint,
  };
  return res.status(err.status || (err.error != null ? 400 : 500)).json(response);
};
