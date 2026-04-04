/* @flow */

export type Money = number;

export interface CMoney {
  currency: string;
  asFixed(): Money;
  asFloat(): string;
  value(): number;
  divide(d: number): CMoney;
  multiply(d: number): CMoney;
  subtract(other: CMoney): CMoney;
  add(other: CMoney): CMoney;
  asBaseCurrency(): CMoney;
  asCurrency(currency: string): CMoney;
  withValue(d: number): CMoney;
  min(other: CMoney): CMoney;
  max(other: CMoney): CMoney;
}

const formatMoney = (amount: Money): number => parseFloat(amount) / 100; // TODO parseFloat should not be needed
const parseMoney = (str: string | number): Money => Math.round(parseFloat(str) * 100);

class MoneyImpl implements CMoney {
  currency: string;

  amount: number;

  constructor(amount: Money, currency: string) {
    (this: any).asFixed = this.asFixed.bind(this);
    (this: any).asFloat = this.asFloat.bind(this);
    (this: any).value = this.value.bind(this);
    (this: any).subtract = this.subtract.bind(this);
    (this: any).add = this.add.bind(this);
    (this: any).multiply = this.multiply.bind(this);
    (this: any).divide = this.divide.bind(this);
    (this: any).min = this.min.bind(this);
    (this: any).max = this.max.bind(this);
    (this: any).withValue = this.withValue.bind(this);
    (this: any).asCurrency = this.asCurrency.bind(this);
    (this: any).asBaseCurrency = this.asBaseCurrency.bind(this);
    (this: any).inspect = this.inspect.bind(this);
    this.currency = currency;
    this.amount = parseInt(amount, 10);
    if (isNaN(this.amount)) {
      throw new Error(`Invalid amount ${amount}`);
    }
  }

  asFixed() {
    return this.amount;
  }

  asFloat() {
    return formatMoney(this.amount).toFixed(2);
  }

  value() {
    return this.amount / 100;
  }

  subtract(other: CMoney) {
    return new MoneyImpl(this.amount - other.asFixed(), this.currency);
  }

  add(other: CMoney) {
    return new MoneyImpl(this.amount + other.asFixed(), this.currency);
  }

  multiply(value: number) {
    return new MoneyImpl(this.amount * value, this.currency);
  }

  divide(value: number) {
    return new MoneyImpl(this.amount / value, this.currency);
  }

  min(other: CMoney) {
    return new MoneyImpl(Math.min(other.asFixed(), this.amount), this.currency);
  }

  max(other: CMoney) {
    return new MoneyImpl(Math.max(other.asFixed(), this.amount), this.currency);
  }

  withValue(value: Money) {
    return new MoneyImpl(value, this.currency);
  }

  asCurrency(currency: string) {
    if (currency === 'SEK' || currency === 'NOK') {
      return new MoneyImpl(this.asBaseCurrency().asFixed() * 10, currency);
    }
    return new MoneyImpl(this.asFixed(), currency);
  }

  asBaseCurrency() {
    if (this.currency === 'SEK' || this.currency === 'NOK') {
      return new MoneyImpl(this.asFixed() / 10, 'EUR');
    }
    return new MoneyImpl(this.asFixed(), 'EUR');
  }

  static parse(value: string | number, currency: string) {
    return new MoneyImpl(parseMoney(value), currency);
  }

  inspect() {
    return `[Money: ${this.asFloat()} ${this.currency}]`;
  }
}
module.exports = { Money: MoneyImpl, parseMoney, formatMoney };
