import type { GoBet, GoUserBetsResponse, GoPlaceBetResponse } from "./betting-types";
import type {
  BetDetail,
  BetPart,
  BetTypeEnum,
  BetStatusEnum,
  BetOutcomeEnum,
} from "@phoenix-ui/utils";
import type { PaginatedResponse } from "../../api/contracts";

/** Convert decimal odds to American string. */
function decimalToAmerican(decimal: number): string {
  if (decimal >= 2) {
    return `+${Math.round((decimal - 1) * 100)}`;
  }
  return `${Math.round(-100 / (decimal - 1))}`;
}

/** Convert decimal odds to fractional string. */
function decimalToFractional(decimal: number): string {
  const numerator = Math.round((decimal - 1) * 100);
  const denominator = 100;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

/** Build a DisplayOdds object from a decimal odds value. */
function buildDisplayOdds(decimal: number) {
  return {
    american: decimalToAmerican(decimal),
    decimal,
    fractional: decimalToFractional(decimal),
  };
}

/** Map Go bet status → frontend BetStatusEnum. */
function mapGoStatusToBetStatus(goStatus: string): string {
  const map: Record<string, string> = {
    open: "OPEN",
    pending: "OPEN",
    matched: "OPEN",
    won: "SETTLED",
    lost: "SETTLED",
    settled: "SETTLED",
    cancelled: "CANCELLED",
    voided: "VOIDED",
    pushed: "PUSHED",
    cashed_out: "SETTLED",
  };
  return map[goStatus?.toLowerCase()] || "OPEN";
}

/** Map Go bet outcome → frontend BetOutcomeEnum. */
function mapGoOutcomeToBetOutcome(
  goOutcome: string | undefined,
  goStatus: string,
): string | undefined {
  if (goOutcome) {
    const map: Record<string, string> = {
      won: "WON",
      lost: "LOST",
      cancelled: "cancelled",
      cashed_out: "cashedOut",
    };
    return map[goOutcome.toLowerCase()];
  }
  // Derive from status if outcome not provided
  const statusOutcomeMap: Record<string, string> = {
    won: "WON",
    lost: "LOST",
    cashed_out: "cashedOut",
    cancelled: "cancelled",
  };
  return statusOutcomeMap[goStatus?.toLowerCase()];
}

/**
 * Transform a Go bet into frontend BetDetail shape.
 * Go returns flat bets; we synthesize a single-leg BetPart.
 */
export function transformGoBetToBetDetail(goBet: GoBet): BetDetail {
  const displayOdds = buildDisplayOdds(goBet.odds);
  const status = mapGoStatusToBetStatus(goBet.status) as BetStatusEnum;
  const outcome = mapGoOutcomeToBetOutcome(
    goBet.outcome,
    goBet.status,
  ) as BetOutcomeEnum | undefined;

  const leg: BetPart = {
    id: goBet.bet_id,
    fixture: {
      id: goBet.event_id || "",
      name: goBet.home_team && goBet.away_team
        ? `${goBet.home_team} vs ${goBet.away_team}`
        : "",
      startTime: goBet.created_at,
      status: goBet.status,
    },
    market: {
      id: goBet.market_id,
      name: goBet.market_type || "",
    },
    selection: {
      id: goBet.outcome_id,
      name: goBet.outcome_name || "",
    },
    sport: {
      id: goBet.sport || "",
      name: goBet.sport || "",
    },
    competitor: {
      id: "",
      name: "",
    },
    tournament: {
      id: goBet.league || "",
      name: goBet.league || "",
    },
    odds: goBet.odds,
    displayOdds,
    placedAt: goBet.created_at,
    outcome,
    status,
  };

  const profitLoss =
    goBet.payout != null ? goBet.payout - goBet.stake : undefined;

  return {
    betId: goBet.bet_id,
    betType: "SINGLE" as BetTypeEnum,
    stake: {
      amount: goBet.stake,
      currency: "USD",
    },
    placedAt: goBet.created_at,
    odds: goBet.odds,
    displayOdds,
    sports: goBet.sport
      ? [{ id: goBet.sport, name: goBet.sport }]
      : [],
    profitLoss,
    legs: [leg],
    outcome,
  };
}

/**
 * Transform Go user bets response → PaginatedResponse<BetDetail>.
 * Matches the shape used by win-loss-statistics and open-bets components.
 */
export function transformGoUserBetsResponse(
  response: GoUserBetsResponse,
): PaginatedResponse<BetDetail> {
  return {
    data: response.bets.map(transformGoBetToBetDetail),
    totalCount: response.total,
    currentPage: response.page,
    itemsPerPage: response.limit,
    hasNextPage: response.page * response.limit < response.total,
  };
}

/**
 * Transform Go place-bet response → old PlaceBetResponseItem shape.
 * Used by betslip to match placed bets back to betslip entries.
 */
export function transformGoPlaceBetResponse(response: GoPlaceBetResponse) {
  return {
    betId: response.bet_id,
    marketId: response.market_id,
    selectionId: response.outcome_id,
  };
}
