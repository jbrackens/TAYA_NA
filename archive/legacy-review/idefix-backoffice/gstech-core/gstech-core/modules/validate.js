/* @flow */
const flow = require('lodash/fp/flow');
const pick = require('lodash/fp/pick');
const map = require('lodash/fp/map');
const keyBy = require('lodash/fp/keyBy');
const mapValues = require('lodash/fp/mapValues');
const uniqBy = require('lodash/fp/uniqBy');
const capitalize = require('lodash/fp/capitalize');
const lowerCase = require('lodash/fp/lowerCase');
const stringify = require('json-stringify-safe');

const HttpError = require('./HttpError');

const beautifyMessage = (message) => {
  const [, field, error] = message.split('"');
  return `${capitalize(lowerCase(field))}${error}`;
};

const getJoiErrors = flow([
  uniqBy('path'),
  map(pick(['path', 'message'])),
  keyBy('path'),
  mapValues(({ message }) => beautifyMessage(message)),
]);

const validate = function generic<T: {}>(obj: mixed, schema: { validate: (obj: mixed, options: {}) => { error: any, value: T} }, failMessage: ?string = null, options: {} = {}): T {
  const { error, value } = schema.validate(obj, { ...options, abortEarly: false });

  if (error) {
    const errors = getJoiErrors(error.details);
    throw new HttpError(400, `${failMessage ? `${failMessage}:\n` : ''}${stringify(errors, null, 2)}`);
  }

  return value;
};

module.exports = validate;
