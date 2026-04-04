const formatToCurrency = (amount: number) => (Number(amount) / 100).toString();
const formatToCents = (amount: number) => amount * 100;

export { formatToCents, formatToCurrency };
