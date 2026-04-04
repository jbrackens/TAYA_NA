/* @flow */

const assert = require('assert');
const { Money } = require('./money-class');

describe('Money class', () => {
  it('converts SEK to base currency', () =>
    assert.equal(
      Money.parse(200, 'SEK')
        .asBaseCurrency()
        .asFixed(),
      Money.parse(20, 'EUR').asFixed(),
    ));

  it('converts NOK to base currency', () =>
    assert.equal(
      Money.parse(200, 'NOK')
        .asBaseCurrency()
        .asFixed(),
      Money.parse(20, 'EUR').asFixed(),
    ));

  it('converts GBP to base currency', () =>
    assert.equal(
      Money.parse(200, 'GBP')
        .asBaseCurrency()
        .asFixed(),
      Money.parse(200, 'EUR').asFixed(),
    ));

  it('converts EUR to base currency', () =>
    assert.equal(
      Money.parse(200, 'EUR')
        .asBaseCurrency()
        .asFixed(),
      Money.parse(200, 'EUR').asFixed(),
    ));

  it('converts EUR to SEK', () =>
    assert.equal(
      Money.parse(200, 'EUR')
        .asCurrency('SEK')
        .asFixed(),
      Money.parse(2000, 'SEK').asFixed(),
    ));

  it('converts EUR to USD', () =>
    assert.equal(
      Money.parse(200, 'EUR')
        .asCurrency('USD')
        .asFixed(),
      Money.parse(200, 'USD').asFixed(),
    ));
});
