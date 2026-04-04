/* @flow */
const _ = require('lodash');
const errors = require('gstech-core/modules/errors/error-codes');
const logger = require('./logger');
const { localize } = require('./localization');

const codeToErrorKey: { [string]: string } = {};
_.forEach(errors, (value, key) => {
  codeToErrorKey[String(value.code)] = key;
});

export type LegacyError = {
  ErrorNo: string,
  Description: string,
};

export type BackendError = {
  error: {
    code: number,
    message: string,
  },
};

export type Err = GSError | LegacyError | BackendError;

const findError = (error: ?Err) => {
  if (error != null && error.ErrorNo != null) {
    return codeToErrorKey[error.ErrorNo] || error.ErrorNo;
  }
  if (error != null && error.error && error.error.code != null) {
    return codeToErrorKey[String(error.error.code)];
  }
  if (error != null && error.code != null) {
    return codeToErrorKey[String(error.code)];
  }
};

const handleError = (req: express$Request, res: express$Response, x: ?Err): express$Response => {
  let errorCode = null;
  if (x != null && x.error != null && x.error.code != null) {
    errorCode = String(x.error.code);
  }
  if (errorCode == null && x != null && x.ErrorNo != null) {
    errorCode = x.ErrorNo;
  }
  if (errorCode == null && x != null && x.code != null) {
    errorCode = String(x.code);
  }

  logger.warn('handleError', {
    sessionUser: req.session?.username,
    username: req.user?.username,
    x,
    errorCode,
  });

  if (errorCode === String(errors.SESSION_EXPIRED.code)) {
    req.session.destroy();
    const result = localize(req.context != null ? req.context.languageISO : 'en')('login.session-died', false);
    return res.status(401).json({ ok: false, result });
  }

  let message = localize(req.context != null ? req.context.languageISO : undefined)(`error.${errorCode || ''}`, false);
  if (message == null) {
    message = localize(req.context != null ? req.context.languageISO : undefined)('error.generic', false);
  }

  const result = { ok: false, result: message, code: findError(x) };

  if (errorCode == null) {
    logger.error('Generic error', req.user != null && req.user.username, req.originalUrl, x, result);
  }
  return res.json(result);
};

module.exports = { handleError };
