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

  constructor(amount: Money | string, currency: string) {
    // $FlowFixMe[method-unbinding]
    (this: any).asFixed = this.asFixed.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).asFloat = this.asFloat.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).value = this.value.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).subtract = this.subtract.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).add = this.add.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).multiply = this.multiply.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).divide = this.divide.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).min = this.min.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).max = this.max.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).withValue = this.withValue.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).asCurrency = this.asCurrency.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).asBaseCurrency = this.asBaseCurrency.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).inspect = this.inspect.bind(this);
    this.currency = currency;
    this.amount = parseInt(amount, 10);
    if (isNaN(this.amount)) {
      throw new Error(`Invalid amount ${amount}`);
    }
  }

  asFixed(): number {
    return this.amount;
  }

  asFloat(): string {
    return formatMoney(this.amount).toFixed(2);
  }

  value(): number {
    return this.amount / 100;
  }

  subtract(other: CMoney): CMoney {
    return new MoneyImpl(this.amount - other.asFixed(), this.currency);
  }

  add(other: CMoney): CMoney {
    return new MoneyImpl(this.amount + other.asFixed(), this.currency);
  }

  multiply(value: number): CMoney {
    return new MoneyImpl(this.amount * value, this.currency);
  }

  divide(value: number): CMoney {
    return new MoneyImpl(this.amount / value, this.currency);
  }

  min(other: CMoney): CMoney {
    return new MoneyImpl(Math.min(other.asFixed(), this.amount), this.currency);
  }

  max(other: CMoney): CMoney {
    return new MoneyImpl(Math.max(other.asFixed(), this.amount), this.currency);
  }

  withValue(value: Money): CMoney {
    return new MoneyImpl(value, this.currency);
  }

  asCurrency(currency: string): CMoney {
    if (currency === 'SEK' || currency === 'NOK') {
      return new MoneyImpl(this.asBaseCurrency().asFixed() * 10, currency);
    }
    if (currency === 'INR') {
      return new MoneyImpl(this.asBaseCurrency().asFixed() * 100, currency);
    }
    if (currency === 'BRL') {
      return new MoneyImpl(this.asBaseCurrency().asFixed() * 5, currency);
    }
    if (currency === 'CLP') {
      return new MoneyImpl(this.asBaseCurrency().asFixed() * 800, currency);
    }
    if (currency === 'PEN') {
      return new MoneyImpl(this.asBaseCurrency().asFixed() * 4, currency);
    }
    return new MoneyImpl(this.asBaseCurrency().asFixed(), currency);
  }

  asBaseCurrency(): CMoney {
    if (this.currency === 'SEK' || this.currency === 'NOK') {
      return new MoneyImpl(this.asFixed() / 10, 'EUR');
    }
    if (this.currency === 'INR') {
      return new MoneyImpl(this.asFixed() / 100, 'EUR');
    }
    if (this.currency === 'BRL') {
      return new MoneyImpl(this.asFixed() / 5, 'EUR');
    }
    if (this.currency === 'CLP') {
      return new MoneyImpl(this.asFixed() / 800, 'EUR');
    }
    if (this.currency === 'PEN') {
      return new MoneyImpl(this.asFixed() / 4, 'EUR');
    }
    return new MoneyImpl(this.asFixed(), 'EUR');
  }

  static parse(value: string | number, currency: string): CMoney {
    return new MoneyImpl(parseMoney(value), currency);
  }

  inspect(): string {
    return `[Money: ${this.asFloat()} ${this.currency}]`;
  }
}
module.exports = ({ Money: MoneyImpl, parseMoney, formatMoney }: any);
