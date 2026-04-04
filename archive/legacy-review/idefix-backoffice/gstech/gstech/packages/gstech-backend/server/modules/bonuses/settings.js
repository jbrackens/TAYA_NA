/* @flow */

const settings = {
  overbetWageringRequirement: 50,
  smallBonusConversionThreshold: 250,
  bigwin: 1000000,
  EUR: {
    overbetLimit: 500,
    baseCurrencyMultiplier: 1,
  },
  SEK: {
    overbetLimit: 5000,
    baseCurrencyMultiplier: 10,
  },
  NOK: {
    overbetLimit: 5000,
    baseCurrencyMultiplier: 10,
  },
  USD: {
    overbetLimit: 500,
    baseCurrencyMultiplier: 1,
  },
  GBP: {
    overbetLimit: 500,
    baseCurrencyMultiplier: 1,
  },
  CAD: {
    overbetLimit: 500,
    baseCurrencyMultiplier: 1,
  },
  BRL: {
    overbetLimit: 2500,
    baseCurrencyMultiplier: 5,
  },
  PEN: {
    overbetLimit: 2000,
    baseCurrencyMultiplier: 4,
  },
  CLP: {
    overbetLimit: 250000,
    baseCurrencyMultiplier: 800,
  },
};

module.exports = settings;
