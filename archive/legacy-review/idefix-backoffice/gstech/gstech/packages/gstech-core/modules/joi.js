/* @flow */
const Joi = require('joi');
const iban = require('iban');

const miserypt = require('./miserypt');
const { brands } = require('./constants');
const trustlyClearingHouses = require('./trustlyClearingHouses');

const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const bankAccountRE = /^([0-9\- ]{4,7})[ ]{0,1}\/[ ]{0,1}([0-9 -]{5,15})$/;
const canadianBankAccountRE = /^([0-9]{10,25})$/;

const production = process.env.NODE_ENV === 'production';

const devDefault = (joi: Joi$Root): Joi$Extension => ({
  type: 'devDefault',
  base: joi.string().trim(),
  args(schema, defaultValue) {
    if (production) return schema.required();
    const { error } = joi
      .string()
      .trim()
      .required()
      .validate(defaultValue, { messages: { '*': 'Invalid default value' } });
    if (!error) return schema.default(defaultValue);
    throw new Error(error);
  },
});

const customString = (joi: Joi$Root): Joi$Extension => ({
  type: 'string',
  base: joi.string().trim(),
  messages: {
    'string.brandId': '"{:brandId}" is not a valid brand',
    'string.money': '{#label} is not a valid money amount',
    'string.iban': '{#label} is not a valid IBAN number',
    'string.bic': '{#label} is not a valid BIC/SWIFT number',
    'string.bankAccount': '{#label} is not a valid bank account',
    'string.decrypt': '{#label} cannot be decrypted',
    'string.trustlyIban': '{#label} is invalid',
  },
  rules: {
    brandId: {
      validate(value, helpers) {
        const found = brands.some((k) => k.id === value);
        if (!found) {
          return helpers.error('string.brandId', { v: value });
        }
        return value;
      },
    },
    money: {
      validate(value, helpers) {
        const n = Number(value);
        if (isNaN(n)) {
          return helpers.error('string.money', { v: value });
        }
        return Math.round(n * 100);
      },
    },
    iban: {
      validate(value, helpers) {
        if (!iban.isValid(value)) {
          return helpers.error('string.iban', { v: value });
        }
        return iban.electronicFormat(value);
      },
    },
    trustlyIban: {
      validate(value, helpers) {
        const match = Object.keys(trustlyClearingHouses).find((r) =>
          value.replace(/\s+/g, '').match(trustlyClearingHouses[r]),
        );
        if (!match) {
          return helpers.error('string.trustlyIban', { v: value });
        }

        return value;
      },
    },
    bankAccount: {
      validate(value, helpers) {
        if (!bankAccountRE.test(value) && !canadianBankAccountRE.test(value)) {
          return helpers.error('string.bankAccount', { v: value });
        }
        return value;
      },
    },
    bic: {
      validate(value, helpers) {
        if (!bicRegex.test(value)) {
          return helpers.error('string.bic', { v: value });
        }
        return value;
      },
    },
    decrypt: {
      validate(value, helpers) {
        const r = value.match(/^GS\[(.*)\]$/);
        if (r) {
          try {
            const decrypted = miserypt.decryptConfigLine(r[1]);
            return decrypted;
          } catch (e) {
            return helpers.error('string.decrypt', { v: value });
          }
        }

        return value;
      },
    },
  },
});

const customQueryParams = (joi: Joi$Root): Joi$Extension => ({
  type: 'queryParam',
  base: joi.array(),
  coerce: {
    from: 'string',
    method(value) {
      if (typeof value === 'string') {
        return { value: value.split(',') };
      }
      return { value };
    },
  },
});

module.exports = (Joi.extend(devDefault)
  .extend(customString)
  .extend(customQueryParams): Joi$Root);
