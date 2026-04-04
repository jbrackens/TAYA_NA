/* @flow */

class HttpError extends Error {
  httpCode: number;

  constructor(httpCode: number, message: string) {
    super(message);
    this.httpCode = httpCode;
    Error.captureStackTrace(this, HttpError);
  }
}

module.exports = HttpError;
