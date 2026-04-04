/* @flow */
const moment = require('moment-timezone');
const { formatMoney } = require('../core/money');

const periodTypeMapping = {
  weekly: 'week',
  monthly: 'month',
  daily: 'day',
};

const formatLimitTime = (limit: any) => (limit.permanent && !limit.expires ? '' : ` Limit is active until ${moment(limit.expires).format('DD.MM.YYYY HH:mm')}.`);
const formatLimitAmount = (limit: any, currencyId: string) => `${formatMoney(limit.limitValue, currencyId)} per ${periodTypeMapping[limit.periodType]}`;
const formatLimitLeft = (limit: any, currencyId: string) => ` (${formatMoney(limit.limitValue - limit.amount, currencyId)} left)`;

const formatExclusion = (limit: ?any): string => limit == null ? '' : (limit.permanent && !limit.expires ? 'Permanent limit active' : formatLimitTime(limit)); // eslint-disable-line
const formatSessionLength = (limit: ?any): null | string => (limit ? `${limit.limitValue} minutes per session.${formatLimitTime(limit)}` : null);
const formatLimit = (currencyId: string): ((limit: ?any) => null | string) => (limit: ?any) => (limit ? `${formatLimitAmount(limit, currencyId)}${formatLimitLeft(limit, currencyId)}.${formatLimitTime(limit)}` : null);

module.exports = { formatExclusion, formatSessionLength, formatLimit };
