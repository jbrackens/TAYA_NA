// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  reportQuerySchema: (joi.object({
    month: joi.date().iso(),
    brandId: joi.string().trim().uppercase().alphanum().allow(null),
    paymentProviderName: joi.string().trim(),
    text: joi.string().trim().empty(['', null]),
    pageSize: joi.number().min(1),
    pageIndex: joi.number().integer().default(0),
    sortBy: joi
      .string()
      .trim()
      .valid(
        'timestamp',
        'id',
        'externalTransactionId',
        'method',
        'account',
        'currencyId',
        'amount',
        'name',
        'username',
        'countryId',
        'handle',
        'transactionKey'
      )
      .optional()
      .allow(null, '')
      .when('.', { is: joi.valid('', null), then: joi.strip() }),
    sortDirection: joi
      .string()
      .trim()
      .uppercase()
      .valid('ASC', 'DESC')
      .optional()
      .default('DESC')
      .when('sortBy', { is: joi.valid('', null), then: joi.strip() }),
  }): any),
  riskProfileReportSchema: (joi.object({
    brandId: joi.string().trim().uppercase().alphanum().allow(null),
  }): any),
  riskTransactionReportSchema: (joi.object({
    month: joi.date().iso(),
    brandId: joi.string().trim().uppercase().alphanum().allow(null),
    riskProfile: joi.string().trim().valid('medium', 'high'),
  }): any),
  licenseReportSchema: (joi.object({
    month: joi.date().iso().required(),
    license: joi.string().trim().uppercase().alphanum().required(),
    country: joi.string().trim().uppercase().alphanum().empty(['', null]),
    gameProfile: joi.string().empty(['', null]),
  }): any),
  weeklyReportQuerySchema: (joi.object({
    week: joi.date().iso(),
    brandId: joi.string().trim().uppercase().alphanum().allow(null),
    paymentProviderName: joi.string().trim(),
    text: joi.string().trim().empty(['', null]),
    pageSize: joi.number().min(1),
    pageIndex: joi.number().integer().default(0),
    sortBy: joi
      .string()
      .trim()
      .valid(
        'id',
        'timestamp',
        'status',
        'externalTransactionId',
        'method',
        'account',
        'amount',
        'currencyId',
        'name',
        'username',
        'countryId',
        'transactionKey',
      )
      .optional()
      .allow(null, '')
      .when('.', { is: joi.valid('', null), then: joi.strip() }),
    sortDirection: joi
      .string()
      .trim()
      .uppercase()
      .valid('ASC', 'DESC')
      .optional()
      .default('DESC')
      .when('sortBy', { is: joi.valid('', null), then: joi.strip() }),
  }): any),
  resultsReportSchema: (joi.alternatives().try(
    joi.object({
      span: joi.string().trim().valid('day', 'week', 'month').required(),
      time: joi.date().iso(),
      brandId: joi.string().trim().uppercase().alphanum().allow(null),
    }),
    joi.object({
      span: joi.string().trim().valid('year').required(),
      brandId: joi.string().trim().uppercase().alphanum().allow(null),
    }),
  ): any),
};
