/* @flow */
import type { CMoney, Money } from 'gstech-core/modules/money-class';

const cldr = require('twitter_cldr');
const { parseMoney, formatMoney, Money: M } = require('gstech-core/modules/money-class');

const money2 = (lang: any) => (amount: number, currency: string, decimals: boolean = true) => {
  if (amount != null && currency != null && !isNaN(amount)) {
    if (!lang.code) {
      throw new Error(`Invalid language: ${JSON.stringify(lang)}`);
    }
    const TwitterCldr = cldr.load(lang.code === 'no' ? 'fi' : lang.code);
    const fmt = new TwitterCldr.CurrencyFormatter();
    const precision = decimals ? fmt.default_precision : 0;
    return (amount < 0 ? '-' : '') + fmt.format(Math.abs(amount), { currency, precision });
  }
  return '';
};

const money = (req: any, amount: Money, currency: string, decimals: boolean = true): string => money2({ code: req.context.languageISO })(formatMoney(amount), currency, decimals);

const moneyFrom = (amount: Money, currency: string): CMoney => new M(amount, currency);

module.exports = { formatMoney, parseMoney, money, Money: M, moneyFrom };
