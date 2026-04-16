export interface CurrencyConfig {
  code: string;
  symbol: string;
  decimals: number;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, locale: 'en-GB' },
  AUD: { code: 'AUD', symbol: 'A$', decimals: 2, locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', decimals: 2, locale: 'en-CA' },
};

/**
 * Format currency from cents to display format
 * @param amountCents Amount in cents (e.g., 1000 = $10.00)
 * @param currencyCode Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amountCents: number, currencyCode: string = 'USD'): string {
  const config = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const amount = amountCents / Math.pow(10, config.decimals);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}

/**
 * Format currency from dollar amount to display format
 * @param amount Amount in dollars (e.g., 10.00 = $10.00)
 * @param currencyCode Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrencyFromDollars(amount: number, currencyCode: string = 'USD'): string {
  const config = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}
