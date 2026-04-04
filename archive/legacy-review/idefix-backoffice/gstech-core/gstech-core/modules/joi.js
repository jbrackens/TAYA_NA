/* @flow */
const Joi = require('joi');
const iban = require('iban');

const { brands } = require('./constants');
const trustlyClearingHouses = require('./trustlyClearingHouses');

const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const bankAccountRE = /^([0-9\- ]{4,7})[ ]{0,1}\/[ ]{0,1}([0-9 -]{5,15})$/;
const canadianBankAccountRE = /^([0-9]{10,25})$/;

const production = process.env.NODE_ENV === 'production';

module.exports = Joi.extend(joi => ({
  base: joi.string(),
  name: 'string',
  language: {
    money: 'Not a valid money amount',
    iban: 'Not a valid IBAN number',
    bic: 'Not a valid BIC/SWIFT number',
    bankAccount: 'Not a valid bank account',
  },
  rules: [
    {
      name: 'devDefault',
      params: {
        defaultValue: joi.string().required(),
      },
      setup(params) {
        if (production) {
          return this.required();
        }
        return this.default(params.defaultValue);
      },
    },
    {
      name: 'brandId',
      validate(params, value, state, options) {
        const found = brands.some(k => k.id === value);
        if (!found) {
          return this.createError('string.brandId', { v: value }, state, options);
        }
        return value;
      },
    },
    {
      name: 'money',
      validate(params, value, state, options) {
        const n = Number(value);
        if (isNaN(n)) {
          return this.createError('string.money', { v: value }, state, options);
        }
        return Math.round(n * 100);
      },
    },
    {
      name: 'iban',
      validate(params, value, state, options) {
        if (!iban.isValid(value)) {
          return this.createError('string.iban', { v: value }, state, options);
        }
        return iban.electronicFormat(value);
      },
    },
    {
      name: 'trustlyIban',
      validate(params, value, state, options) {
        const match = Object.keys(trustlyClearingHouses).find(r => value.replace(/\s+/g, '').match(trustlyClearingHouses[r]));
        if (!match) {
          return this.createError('string.trustlyIban', { v: value }, state, options);
        }

        return value;
      },
    },
    {
      name: 'bankAccount',
      validate(params, value, state, options) {
        if (!bankAccountRE.test(value) && !canadianBankAccountRE.test(value)) {
          return this.createError('string.bankAccount', { v: value }, state, options);
        }
        return value;
      },
    },
    {
      name: 'bic',
      validate(params, value, state, options) {
        if (!bicRegex.test(value)) {
          return this.createError('string.bic', { v: value }, state, options);
        }
        return value;
      },
    },
  ],
})).extend(joi => ({
  base: joi.array(),
  name: 'queryParam',
  coerce(value, state, options) { // eslint-disable-line no-unused-vars
    if (typeof (value) === 'string') {
      return value.split(',');
    }
    return value;
  },
}));
