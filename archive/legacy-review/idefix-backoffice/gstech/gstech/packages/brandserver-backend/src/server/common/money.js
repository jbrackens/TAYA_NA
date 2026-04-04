/* @flow */
import type { CMoney, Money } from 'gstech-core/modules/money-class';

const { parseMoney, formatMoney, Money: M } = require('gstech-core/modules/money-class');
const utils = require('./utils');

const money = (
  req: express$Request,
  amount: Money,
  currency: string,
  decimals: boolean = true,
): string =>
  utils.money({ code: req.context.languageISO })(formatMoney(amount), currency, decimals);

const moneyFrom = (amount: Money, currency: string): CMoney => new M(amount, currency);

module.exports = { formatMoney, parseMoney, money, Money: M, moneyFrom };
