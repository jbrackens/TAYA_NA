/* @flow */

const assert = require('assert');
const { Money } = require('./money-class');

describe('Money class', () => {
  it('converts SEK to base currency', () =>
    assert.equal(
      Money.parse(200, 'SEK').asBaseCurrency().asFixed(),
      Money.parse(20, 'EUR').asFixed(),
    ));

  it('converts NOK to base currency', () =>
    assert.equal(
      Money.parse(200, 'NOK').asBaseCurrency().asFixed(),
      Money.parse(20, 'EUR').asFixed(),
    ));

  it('converts GBP to base currency', () =>
    assert.equal(
      Money.parse(200, 'GBP').asBaseCurrency().asFixed(),
      Money.parse(200, 'EUR').asFixed(),
    ));

  it('converts EUR to base currency', () =>
    assert.equal(
      Money.parse(200, 'EUR').asBaseCurrency().asFixed(),
      Money.parse(200, 'EUR').asFixed(),
    ));

  it('converts EUR to SEK', () =>
    assert.equal(
      Money.parse(200, 'EUR').asCurrency('SEK').asFixed(),
      Money.parse(2000, 'SEK').asFixed(),
    ));

  it('converts EUR to USD', () =>
    assert.equal(
      Money.parse(200, 'EUR').asCurrency('USD').asFixed(),
      Money.parse(200, 'USD').asFixed(),
    ));

  it('converts EUR to INR', () =>
    assert.equal(
      Money.parse(200, 'EUR').asCurrency('INR').asFixed(),
      Money.parse(20000, 'INR').asFixed(),
    ));

  it('converts EUR to BRL', () =>
    assert.equal(
      Money.parse(200, 'EUR').asCurrency('BRL').asFixed(),
      Money.parse(1000, 'BRL').asFixed(),
    ));

  it('converts EUR to CLP', () =>
    assert.equal(
      Money.parse(200, 'EUR').asCurrency('CLP').asFixed(),
      Money.parse(160000, 'CLP').asFixed(),
    ));

  it('converts EUR to PEN', () =>
    assert.equal(
      Money.parse(200, 'EUR').asCurrency('PEN').asFixed(),
      Money.parse(800, 'PEN').asFixed(),
    ));

  it('converts CLP to EUR', () =>
    assert.equal(
      Money.parse(160000, 'CLP').asCurrency('EUR').asFixed(),
      Money.parse(200, 'EUR').asFixed(),
    ));

  it('converts PEN to EUR', () =>
    assert.equal(
      Money.parse(800, 'PEN').asCurrency('EUR').asFixed(),
      Money.parse(200, 'EUR').asFixed(),
    ));

  it('converts BRL to EUR', () =>
    assert.equal(
      Money.parse(1000, 'BRL').asCurrency('EUR').asFixed(),
      Money.parse(200, 'EUR').asFixed(),
    ));

  it('converts INR to EUR', () =>
    assert.equal(
      Money.parse(20000, 'INR').asCurrency('EUR').asFixed(),
      Money.parse(200, 'EUR').asFixed(),
    ));

  it('converts SEK to EUR', () =>
    assert.equal(
      Money.parse(200, 'SEK').asCurrency('EUR').asFixed(),
      Money.parse(20, 'EUR').asFixed(),
    ));
});
