/* @flow */
const cldr = require('twitter_cldr');

const TwitterCldr = cldr.load('en');
const fmt = new TwitterCldr.CurrencyFormatter();

const formatMoney = (amount: ?Money, currency: ?string): string => {
  if (amount == null) return '-';
  if (currency != null) return fmt.format(amount / 100, { currency });
  return fmt
    .format(amount / 100, { currency: 'EUR' })
    .replace('€', '')
    .trim();
};

module.exports = { formatMoney };
