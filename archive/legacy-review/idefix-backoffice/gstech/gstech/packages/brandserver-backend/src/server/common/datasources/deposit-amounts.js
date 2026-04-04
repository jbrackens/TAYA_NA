// @flow
type Currencies = 'CAD' | 'USD' | 'EUR' | 'NOK' | 'SEK' | 'INR' | 'BRL' | 'CLP' | 'PEN';

export type DepositAmounts = {
  [key: Currencies]: number[],
};

export type DepositAmountsByBrand = {
  [key: BrandId]: DepositAmounts,
};

const initialAmounts: DepositAmounts = {
  CAD: [10, 20, 30, 50, 100],
  USD: [10, 20, 30, 50, 100],
  EUR: [50, 100, 200, 500, 1000],
  NOK: [500, 1000, 2000, 5000, 10000],
  SEK: [500, 1000, 2000, 5000, 10000],
  INR: [1000, 2000, 3000, 5000, 10000],
  BRL: [30, 60, 100, 250, 500],
  CLP: [5000, 10000, 20000, 100000, 200000],
  PEN: [20, 60, 100, 200, 400],
};

const depositAmounts: DepositAmountsByBrand = {
  LD: initialAmounts,
  CJ: {
    ...initialAmounts,
    PEN: [40, 80, 150, 400, 1000],
    CLP: [5000, 10000, 20000, 50000, 100000],
  },
  KK: initialAmounts,
  OS: initialAmounts,
  FK: initialAmounts,
  VB: initialAmounts,
  SN: initialAmounts,
};

const getDepositAmountsByCurrency = (currencyISO: Currencies, brandId: BrandId): number[] =>
  depositAmounts[brandId][currencyISO] || [50, 100, 200, 500, 1000];

module.exports = {
  getDepositAmountsByCurrency,
};
