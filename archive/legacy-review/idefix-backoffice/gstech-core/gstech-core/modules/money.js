/* @flow */

const cldr = require('twitter_cldr');

const parseMoney = (str: string | number): Money => Math.round(parseFloat(str) * 100);
const formatMoney = (amount: Money): number => amount / 100;
const asFloat = (amount: Money): string => (amount / 100).toFixed(2);

const formatCurrency = (
  amount: number,
  currency: string,
  langCode: string,
  decimals: boolean = true,
): string => {
  const TwitterCldr = cldr.load(langCode === 'no' ? 'fi' : langCode);
  const fmt = new TwitterCldr.CurrencyFormatter();
  const precision = decimals ? fmt.default_precision : 0;
  return (amount < 0 ? '-' : '') + fmt.format(Math.abs(amount), { currency, precision });
};

module.exports = { parseMoney, formatCurrency, formatMoney, asFloat };
