/**
 * Transform Go market responses → existing frontend Market types.
 */
import type { GoMarket } from "./markets-types";

/**
 * Map a Go market → the Fixture-list Market shape (simple, for match listing).
 * Used by FixtureListComponent which displays winner market odds inline.
 */
export function transformGoMarketToListMarket(goMarket: GoMarket): Record<string, unknown> {
  const selectionOdds = goMarket.outcomes.map((outcome) => ({
    selectionId: outcome.outcome_id,
    selectionName: mapOutcomeToSelectionName(outcome.name),
    odds: goMarket.odds[outcome.outcome_id] || 0,
    displayOdds: {
      decimal: goMarket.odds[outcome.outcome_id] || 0,
      american: decimalToAmerican(goMarket.odds[outcome.outcome_id] || 0),
      fractional: decimalToFractional(goMarket.odds[outcome.outcome_id] || 0),
    },
  }));

  return {
    marketId: goMarket.market_id,
    marketName: goMarket.market_type,
    marketType: mapGoMarketType(goMarket.market_type),
    marketStatus: { type: goMarket.status === "open" ? "ACTIVE" : "SUSPENDED" },
    selectionOdds,
  };
}

/**
 * Map a Go market → the fixture detail MarketArrayValue shape (rich, with categories).
 * Used by the Fixture detail page which groups markets by category.
 */
export function transformGoMarketToDetailMarket(goMarket: GoMarket): Record<string, unknown> {
  const selectionOdds = goMarket.outcomes.map((outcome) => ({
    active: goMarket.status === "open",
    selectionId: outcome.outcome_id,
    selectionName: mapOutcomeToSelectionName(outcome.name),
    odds: goMarket.odds[outcome.outcome_id] || 0,
    displayOdds: {
      decimal: goMarket.odds[outcome.outcome_id] || 0,
      american: decimalToAmerican(goMarket.odds[outcome.outcome_id] || 0),
      fractional: decimalToFractional(goMarket.odds[outcome.outcome_id] || 0),
    },
  }));

  return {
    marketId: goMarket.market_id,
    marketName: goMarket.market_type,
    marketType: mapGoMarketType(goMarket.market_type),
    marketCategory: mapGoMarketTypeToCategory(goMarket.market_type),
    marketStatus: {
      type: goMarket.status === "open" ? "ACTIVE" : "SUSPENDED",
      changeReason: { status: goMarket.status, type: goMarket.status },
    },
    selectionOdds,
    specifiers: { map: "", value: "" },
  };
}

/**
 * Map Go market_type → frontend MATCH_WINNER style.
 * Go uses: "moneyline", "spread", "total", etc.
 */
function mapGoMarketType(goType: string): string {
  switch (goType.toLowerCase()) {
    case "moneyline":
    case "match_winner":
      return "MATCH_WINNER";
    case "spread":
    case "handicap":
      return "HANDICAP";
    case "total":
    case "over_under":
      return "TOTAL";
    default:
      return goType.toUpperCase();
  }
}

function mapGoMarketTypeToCategory(goType: string): string {
  const mapped = mapGoMarketType(goType);
  if (mapped.includes("MATCH") || mapped.includes("WINNER")) {
    return "MATCH_WINNER";
  }
  return mapped;
}

/**
 * Map outcome names → standardized selection names.
 * Go uses team names; frontend expects "home", "away", "draw".
 */
function mapOutcomeToSelectionName(outcomeName: string): string {
  const lower = outcomeName.toLowerCase();
  if (lower === "draw" || lower === "tie") return "draw";
  if (lower === "home" || lower.includes("team a")) return "home";
  if (lower === "away" || lower.includes("team b")) return "away";
  // For team-named outcomes, pass through — BetButton handles display
  return outcomeName;
}

/** Convert decimal odds to American format. */
function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/** Convert decimal odds to fractional string. */
function decimalToFractional(decimal: number): string {
  if (decimal <= 1) return "0/1";
  const numerator = Math.round((decimal - 1) * 100);
  const denominator = 100;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}
