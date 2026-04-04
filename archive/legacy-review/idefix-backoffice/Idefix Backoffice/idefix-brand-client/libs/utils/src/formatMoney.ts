import * as accounting from "accounting";

export function formatMoney(amount: number, currencySymbol: string) {
  return accounting.formatMoney(amount, {
    symbol: currencySymbol,
    precision: 2,
    thousand: " ",
    decimal: ","
  });
}
