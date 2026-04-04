import isNumber from "lodash/isNumber";

export const formatMoneyFromCents = (value: number) => (isNumber(value) ? Number(value / 100).toFixed(2) : value);
