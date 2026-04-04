export enum Currency {
  USD = "USD",
}

export const useCurrencyHook = (currency: Currency) => {
  const formatCurrencyValue = (value: number) => {
    switch (currency) {
      case Currency.USD:
        return `$${value.toFixed(2)}`;
      default:
        return `$${value.toFixed(2)}`;
    }
  };

  const getCurrency = () => {
    switch (currency) {
      case Currency.USD:
        return `$`;
      default:
        return `$`;
    }
  };

  return { formatCurrencyValue, getCurrency };
};
