/* @flow */
import type { AccountInfo } from './Account';

const identifyCard = require('credit-card-identifier');
const _ = require('lodash');

const accountsWithNoNumber = [
  'BankTransfer',
  'InteracETransfer',
  'InteracOnline',
  'Pix',
  'Boleto',
  'Itau',
  'PagoEfectivo',
  'BCP',
  'WebPay',
  'MercadoPago'
];

const bankAccount = (account: AccountInfo): boolean => _.includes(accountsWithNoNumber, account.method) && account.account !== '';
const placeholderBankAccount = (account: {...AccountInfo, ...}): boolean => _.includes(accountsWithNoNumber, account.method) && account.account === '';

const allowsWithdrawals = (account: { ...AccountInfo, ... }): boolean => {
  if (account.method === 'CreditCard') {
    const type = identifyCard(account.account.replace(/\*/g, '0'));
    return type !== 'MasterCard' && type !== 'Maestro';
  }
  if (account.method === 'BankTransfer' && account.account.match(/^NO(.*)$/)) {
    return false;
  }
  return !placeholderBankAccount(account);
};

module.exports = { allowsWithdrawals, placeholderBankAccount, bankAccount };
