/**
 * Odds Format Conversion Utility
 * ================================
 * Converts between Decimal, American, and Fractional odds formats.
 * All internal odds are stored as Decimal (e.g. 2.50).
 * Display format is controlled by DisplayOddsEnum from settingsSlice.
 */

import { DisplayOddsEnum } from '../store/settingsSlice';

/**
 * Convert decimal odds to American format.
 *   Decimal >= 2.0 → positive American: (decimal - 1) * 100  → "+150"
 *   Decimal < 2.0  → negative American: -100 / (decimal - 1) → "-200"
 */
export function decimalToAmerican(decimal: number): string {
  if (decimal <= 1) return '-';
  if (decimal >= 2) {
    const american = Math.round((decimal - 1) * 100);
    return `+${american}`;
  } else {
    const american = Math.round(-100 / (decimal - 1));
    return `${american}`;
  }
}

/**
 * Convert decimal odds to Fractional format.
 * Uses a greatest common divisor approach for clean fractions.
 *   Decimal 2.50 → "3/2"
 *   Decimal 1.50 → "1/2"
 *   Decimal 3.00 → "2/1"
 */
export function decimalToFractional(decimal: number): string {
  if (decimal <= 1) return '-';

  // Convert to fraction: (decimal - 1) as numerator/denominator
  // Multiply by 100 to avoid floating point issues
  let numerator = Math.round((decimal - 1) * 100);
  let denominator = 100;

  // Greatest common divisor
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(numerator, denominator);

  numerator /= divisor;
  denominator /= divisor;

  // Special case: whole numbers → "2/1", "3/1", etc.
  if (denominator === 1) return `${numerator}/1`;

  return `${numerator}/${denominator}`;
}

/**
 * Format decimal odds to the specified display format.
 */
export function formatOdds(decimal: number, format: DisplayOddsEnum): string {
  if (typeof decimal !== 'number' || isNaN(decimal) || decimal <= 0) return '-';

  switch (format) {
    case DisplayOddsEnum.AMERICAN:
      return decimalToAmerican(decimal);
    case DisplayOddsEnum.FRACTIONAL:
      return decimalToFractional(decimal);
    case DisplayOddsEnum.DECIMAL:
    default:
      return decimal.toFixed(2);
  }
}

/**
 * Convert American odds back to decimal (for API calls that need decimal).
 */
export function americanToDecimal(american: number): number {
  if (american > 0) {
    return american / 100 + 1;
  } else {
    return 100 / Math.abs(american) + 1;
  }
}

/**
 * Get the label for an odds format (for settings UI).
 */
export function getOddsFormatLabel(format: DisplayOddsEnum): string {
  switch (format) {
    case DisplayOddsEnum.AMERICAN:
      return 'American';
    case DisplayOddsEnum.FRACTIONAL:
      return 'Fractional';
    case DisplayOddsEnum.DECIMAL:
    default:
      return 'Decimal';
  }
}
