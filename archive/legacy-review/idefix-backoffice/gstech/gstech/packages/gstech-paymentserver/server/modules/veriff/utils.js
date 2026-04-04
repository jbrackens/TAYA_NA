/* @flow */

const config = require('../../../config');

const veriffConfig = config.providers.veriff;

const getVeriffHeaders = (
  signature: string,
  json: boolean = true,
): | { 'content-type': mixed, 'x-auth-client': mixed, 'x-signature': mixed }
  | { 'x-auth-client': mixed, 'x-signature': mixed } => {
  const headers = {
    'x-auth-client': veriffConfig.apiToken,
    'x-signature': signature,
  };
  return json ? { ...headers, 'content-type': 'application/json' } : headers;
};

module.exports = {
  getVeriffHeaders,
};
