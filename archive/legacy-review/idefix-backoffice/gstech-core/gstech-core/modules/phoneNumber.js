/* @flow */
const { PhoneNumberFormat: { E164, INTERNATIONAL }, PhoneNumberUtil } = require('google-libphonenumber');
const maskdata = require('maskdata');

const phoneUtil = PhoneNumberUtil.getInstance();
const prefixed = (phoneNumber: string) => (phoneNumber[0] === '+' ? phoneNumber : `+${phoneNumber}`);

const parse = (phoneNumber: string, country: ?string): string => {
  const parsed = phoneUtil.parse(prefixed(phoneNumber), country);
  if (!phoneUtil.isValidNumber(parsed)) throw new Error(`The phone number has wrong format '${phoneNumber}'`);

  return phoneUtil.format(parsed, E164).replace(/^\+/, '');
};

const tryParse = (phoneNumber: string, country: ?string): ?string => {
  try {
    return parse(phoneNumber, country);
  } catch (e) {
    return null;
  }
};

const format = (phoneNumber: string, country?: string): string => {
  const parsed = phoneUtil.parse(prefixed(phoneNumber), country);
  if (!phoneUtil.isValidNumber(parsed)) throw new Error(`The phone number has wrong format '${phoneNumber}'`);
  return phoneUtil.format(parsed, E164);
};

const formatMasked = (phoneNumber: string, country?: string): string => {
  const parsed = phoneUtil.parse(prefixed(phoneNumber), country);
  if (!phoneUtil.isValidNumber(parsed)) throw new Error(`The phone number has wrong format '${phoneNumber}'`);

  const formatted = phoneUtil.format(parsed, INTERNATIONAL);
  const maskOptions = {
    maskWith: '*',
    unmaskedStartDigits: formatted.indexOf(' ') + 1,
    unmaskedEndDigits: 4,
  };

  return maskdata.maskPhone(formatted, maskOptions);
};

const isValid = (phoneNumber: string, country: ?string): boolean => {
  try {
    const parsed = phoneUtil.parse(prefixed(phoneNumber), country);
    return phoneUtil.isValidNumber(parsed);
  } catch (e) {
    return false;
  }
};

module.exports = { parse, tryParse, format, formatMasked, isValid };
