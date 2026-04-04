/* @flow */
const _ = require('lodash');
const stringify = require('json-stringify-safe');

const HttpError = require('./HttpError');

const beautifyMessage = ({ message }: { message: string }) => {
  const [, field, error] = message.split('"');
  return `${_.capitalize(
    _.lowerCase(field.includes('.') ? _.last(field.split('.')) : field),
  )}${error}`;
};

const getJoiErrors = ({ details }: Joi$ValidationError) =>
  _.chain(details)
    .flatMap((detail) => (/alternatives/.test(detail.type) ? detail.context.details : detail))
    .uniqBy('path')
    .map((item) => _.pick(item, ['path', 'message']))
    .keyBy('path')
    .mapValues(beautifyMessage)
    .value();

const validate = function generic<T: any>(
  obj: mixed,
  schema: Joi$Schema<T>,
  failMessage: ?string = null,
  options: Joi$BaseValidationOptions = {},
): T {
  const validationResult = schema.validate(obj, { ...options, abortEarly: false });

  if (validationResult.error) {
    const errors = getJoiErrors(validationResult.error);
    throw new HttpError(
      400,
      `${failMessage ? `${failMessage}:\n` : ''}${stringify(errors, null, 2)}`,
    );
  }
  return validationResult.value;
};

module.exports = validate;
