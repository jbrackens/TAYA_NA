import { BetDetail, WalletHistoryActionElement } from "@phoenix-ui/utils";

export type PaginatedResponse<T> = {
  data: T[];
  totalCount: number;
  itemsPerPage: number;
  currentPage: number;
  hasNextPage: boolean;
};

export type WalletBalanceResponse = {
  realMoney: {
    value: {
      amount: number;
      currency?: string;
    };
  };
};

export type PlaceBetRequest = {
  marketId: string;
  selectionId: string;
  stake: {
    amount: number;
    currency: string;
  };
  odds: number;
  acceptBetterOdds: boolean;
  freebetId?: string;
  oddsBoostId?: string;
};

export type PlaceBetResponseItem = {
  betId: string;
  marketId: string;
  selectionId: string | number;
};

export type BetPrecheckRequest = {
  userId: string;
  requestId?: string;
  marketId: string;
  selectionId: string;
  stakeCents: number;
  odds: number;
  acceptAnyOdds?: boolean;
};

export type BetPrecheckResponse = {
  allowed: boolean;
  reasonCode?: string;
  minStakeCents?: number;
  maxStakeCents?: number;
  requiredStakeCents?: number;
  availableBalanceCents?: number;
  requestedOdds?: number;
  currentOdds?: number;
  acceptedOdds?: number;
  oddsChanged?: boolean;
  oddsPolicy?: string;
  inPlay?: boolean;
  appliedLtdMsec?: number;
};

export type BetBuilderQuoteLegRequest = {
  marketId: string;
  selectionId: string;
  requestedOdds?: number;
};

export type BetBuilderQuoteRequest = {
  userId: string;
  requestId: string;
  legs: BetBuilderQuoteLegRequest[];
};

export type BetBuilderQuoteLeg = {
  marketId: string;
  selectionId: string;
  fixtureId?: string;
  requestedOdds?: number;
  currentOdds: number;
};

export type BetBuilderQuoteResponse = {
  quoteId: string;
  userId: string;
  requestId: string;
  comboType?: string;
  combinable: boolean;
  reasonCode?: string;
  combinedOdds?: number;
  impliedProbability?: number;
  expiresAt?: string;
  legs: BetBuilderQuoteLeg[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
  acceptedBetId?: string;
  acceptRequestId?: string;
  acceptIdempotencyKey?: string;
  lastReason?: string;
};

export type BetBuilderAcceptRequest = {
  quoteId: string;
  userId: string;
  requestId: string;
  stakeCents: number;
  idempotencyKey?: string;
  reason?: string;
};

export type BetBuilderAcceptResponse = {
  bet: Record<string, unknown>;
  quote: BetBuilderQuoteResponse;
};

export type FixedExoticType = "exacta" | "trifecta";

export type FixedExoticQuoteLegRequest = {
  position?: number;
  marketId: string;
  selectionId: string;
  requestedOdds?: number;
};

export type FixedExoticQuoteRequest = {
  userId: string;
  requestId: string;
  exoticType: FixedExoticType;
  stakeCents?: number;
  legs: FixedExoticQuoteLegRequest[];
};

export type FixedExoticQuoteLeg = {
  position: number;
  marketId: string;
  selectionId: string;
  fixtureId: string;
  requestedOdds?: number;
  currentOdds: number;
};

export type FixedExoticQuoteResponse = {
  quoteId: string;
  userId: string;
  requestId: string;
  exoticType: string;
  combinable: boolean;
  reasonCode?: string;
  combinedOdds?: number;
  impliedProbability?: number;
  stakeCents?: number;
  potentialPayoutCents?: number;
  encodedTicket?: string;
  expiresAt?: string;
  legs: FixedExoticQuoteLeg[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
  acceptedBetId?: string;
  acceptRequestId?: string;
  acceptIdempotencyKey?: string;
  lastReason?: string;
};

export type FixedExoticAcceptRequest = {
  quoteId: string;
  userId: string;
  requestId: string;
  stakeCents?: number;
  idempotencyKey?: string;
  reason?: string;
};

export type FixedExoticAcceptResponse = {
  bet: Record<string, unknown>;
  quote: FixedExoticQuoteResponse;
};

export type MatchTrackerScore = {
  home: number;
  away: number;
};

export type MatchTrackerIncident = {
  incidentId: string;
  fixtureId: string;
  type: string;
  period?: string;
  clockSeconds?: number;
  occurredAt: string;
  score?: MatchTrackerScore;
  details?: Record<string, string>;
};

export type MatchTrackerTimelineResponse = {
  fixtureId: string;
  status: string;
  period?: string;
  clockSeconds?: number;
  score: MatchTrackerScore;
  incidents: MatchTrackerIncident[];
  updatedAt: string;
};

export type FixtureStatMetric = {
  home: number;
  away: number;
  unit?: string;
};

export type FixtureStatsResponse = {
  fixtureId: string;
  status: string;
  period?: string;
  clockSeconds?: number;
  metrics: Record<string, FixtureStatMetric>;
  updatedAt: string;
};

export type FreebetResponse = {
  freebetId: string;
  playerId: string;
  campaignId?: string;
  currency: string;
  totalAmountCents: number;
  remainingAmountCents: number;
  minOddsDecimal?: number;
  appliesToSportIds?: string[];
  appliesToTournamentIds?: string[];
  expiresAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type FreebetListResponse = {
  items: FreebetResponse[];
  totalCount: number;
};

export type OddsBoostResponse = {
  oddsBoostId: string;
  playerId: string;
  campaignId?: string;
  marketId: string;
  selectionId: string;
  currency: string;
  originalOdds: number;
  boostedOdds: number;
  maxStakeCents?: number;
  minOddsDecimal?: number;
  status: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptRequestId?: string;
  acceptReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type OddsBoostListResponse = {
  items: OddsBoostResponse[];
  totalCount: number;
};

export type OddsBoostAcceptRequest = {
  userId: string;
  requestId: string;
  reason?: string;
};

export type GatewayApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    details?: {
      reasonCode?: string;
      [key: string]: unknown;
    };
  };
};

export type PendingBetStatusRequest = {
  betIds: string[];
};

export type PendingBetStatusItem = {
  betId: string;
};

export type BetDetailsPageResponse = PaginatedResponse<BetDetail>;
export type WalletTransactionsPageResponse =
  PaginatedResponse<WalletHistoryActionElement>;

export type PredictionOrder = {
  orderId: string;
  punterId: string;
  marketId: string;
  marketTitle: string;
  categoryKey: string;
  categoryLabel: string;
  outcomeId: string;
  outcomeLabel: string;
  priceCents: number;
  stakeUsd: number;
  shares: number;
  maxPayoutUsd: number;
  maxProfitUsd: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  marketStatus?: string;
  winningOutcomeLabel?: string;
  settledAt?: string;
  settlementReason?: string;
  settlementActor?: string;
  previousSettledAt?: string;
  previousSettledAmountUsd?: number;
  previousSettlementStatus?: string;
};

export type PredictionOrdersResponse = {
  totalCount: number;
  orders: PredictionOrder[];
};

export type PredictionPlaceOrderRequest = {
  marketId: string;
  outcomeId: string;
  stakeUsd: number;
};

export type PredictionPlaceOrderResponse = {
  order: PredictionOrder;
};

export type PredictionCancelOrderResponse = {
  order: PredictionOrder;
};

export type ApiErrorItem = {
  errorCode: string;
  details?: string;
};

export type ApiErrorResponse = {
  payload?: {
    errors?: ApiErrorItem[];
  };
};

export type ProfileMeResponse = {
  userId?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
  coolOff?: unknown;
  hasToAcceptTerms?: boolean;
  hasToAcceptResponsibilityCheck?: boolean;
  [key: string]: unknown;
};

export type SportSummary = {
  id: string;
  name: string;
  abbreviation: string;
  iconUrl?: string;
  displayToPunters?: boolean;
  isUrlSeparate?: boolean;
  tournaments?: Array<{
    id: string;
    name: string;
    numberOfFixtures: number;
  }>;
};

export type SportsResponse = SportSummary[];

export type LogoutRequest = {
  sessionId: string | null;
};

export type IdpvStartResponse = {
  idpvRedirectUrl?: string;
};

export type GeocomplyLicenseResponse = {
  value: string;
};

export type GeocomplyPacketRequest = {
  encryptedString: string;
};

export type GeocomplyPacketResponse = {
  anotherGeolocationInSeconds: number;
  [key: string]: unknown;
};

export type CommunicationPreferencesRequest = {
  communicationPreferences: {
    announcements: boolean;
    promotions: boolean;
    subscriptionUpdates: boolean;
    signInNotifications: boolean;
  };
  bettingPreferences: {
    autoAcceptBetterOdds: boolean;
  };
};

export type LimitAmount = {
  limit: number | string | null;
  since: string;
};

export type PunterLimitsResponse = {
  daily: {
    current: LimitAmount;
    next?: LimitAmount;
  };
  weekly: {
    current: LimitAmount;
    next?: LimitAmount;
  };
  monthly: {
    current: LimitAmount;
    next?: LimitAmount;
  };
};

export type PunterLimitsRequest = {
  daily:
    | number
    | null
    | {
        length: number;
        unit: string;
      };
  weekly:
    | number
    | null
    | {
        length: number;
        unit: string;
      };
  monthly:
    | number
    | null
    | {
        length: number;
        unit: string;
      };
};

export type PasswordResetByTokenRequest = {
  password: string;
  verificationId?: string;
  verificationCode: string;
};

export type FixtureResponseItem = {
  fixtureId: string;
  fixtureName: string;
  startTime: string;
  markets: unknown[];
  competitors: Record<string, unknown>;
  tournament: Record<string, unknown>;
  status: string;
};

export type FixtureListPageResponse = PaginatedResponse<FixtureResponseItem>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const hasNumber = (value: unknown): value is number => typeof value === "number";

const hasString = (value: unknown): value is string => typeof value === "string";

export const isPaginatedResponse = <T>(
  value: unknown,
  isItem?: (item: unknown) => item is T,
): value is PaginatedResponse<T> => {
  if (!isObject(value)) {
    return false;
  }

  const {
    data,
    totalCount,
    itemsPerPage,
    currentPage,
    hasNextPage,
  } = value as PaginatedResponse<unknown>;

  if (
    !Array.isArray(data) ||
    !hasNumber(totalCount) ||
    !hasNumber(itemsPerPage) ||
    !hasNumber(currentPage) ||
    typeof hasNextPage !== "boolean"
  ) {
    return false;
  }

  if (!isItem) {
    return true;
  }

  return data.every((item) => isItem(item));
};

export const isWalletBalanceResponse = (
  value: unknown,
): value is WalletBalanceResponse => {
  if (!isObject(value) || !isObject(value.realMoney)) {
    return false;
  }

  if (!isObject(value.realMoney.value)) {
    return false;
  }

  return hasNumber(value.realMoney.value.amount);
};

const isBetLegItem = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  if (
    !isObject(value.market) ||
    !hasString(value.market.id) ||
    !hasString(value.market.name)
  ) {
    return false;
  }

  if (
    !isObject(value.fixture) ||
    !hasString(value.fixture.id) ||
    !hasString(value.fixture.name) ||
    !hasString(value.fixture.status)
  ) {
    return false;
  }

  if (!isObject(value.sport) || !hasString(value.sport.id)) {
    return false;
  }

  if (
    !isObject(value.selection) ||
    !hasString(value.selection.id) ||
    !hasString(value.selection.name)
  ) {
    return false;
  }

  return isObject(value.displayOdds);
};

const isBetDetailResponseItem = (value: unknown): value is BetDetail => {
  if (!isObject(value)) {
    return false;
  }

  if (
    !isObject(value.stake) ||
    !hasNumber(value.stake.amount) ||
    !Array.isArray(value.legs)
  ) {
    return false;
  }

  return value.legs.every((leg) => isBetLegItem(leg));
};

export const isBetDetailsPageResponse = (
  value: unknown,
): value is BetDetailsPageResponse =>
  isPaginatedResponse(value, isBetDetailResponseItem);

const isFixtureResponseItem = (value: unknown): value is FixtureResponseItem => {
  if (!isObject(value)) {
    return false;
  }

  if (
    !hasString(value.fixtureId) ||
    !hasString(value.fixtureName) ||
    !hasString(value.startTime) ||
    !Array.isArray(value.markets) ||
    !isObject(value.competitors) ||
    !isObject(value.tournament) ||
    !hasString(value.status)
  ) {
    return false;
  }

  return true;
};

export const isFixtureListPageResponse = (
  value: unknown,
): value is FixtureListPageResponse =>
  isPaginatedResponse(value, isFixtureResponseItem);

const isWalletTransactionItem = (
  value: unknown,
): value is WalletHistoryActionElement => {
  if (!isObject(value)) {
    return false;
  }

  if (
    !hasString(value.category) ||
    !hasString(value.status) ||
    !hasString(value.transactionId)
  ) {
    return false;
  }

  if (
    !isObject(value.transactionAmount) ||
    !hasNumber(value.transactionAmount.amount) ||
    !isObject(value.preTransactionBalance) ||
    !hasNumber(value.preTransactionBalance.amount) ||
    !isObject(value.postTransactionBalance) ||
    !hasNumber(value.postTransactionBalance.amount)
  ) {
    return false;
  }

  return true;
};

export const isWalletTransactionsPageResponse = (
  value: unknown,
): value is WalletTransactionsPageResponse =>
  isPaginatedResponse(value, isWalletTransactionItem);

const isBetBuilderQuoteLeg = (
  value: unknown,
): value is BetBuilderQuoteLeg => {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasString(value.marketId) &&
    hasString(value.selectionId) &&
    hasNumber(value.currentOdds)
  );
};

export const isBetBuilderQuoteResponse = (
  value: unknown,
): value is BetBuilderQuoteResponse => {
  if (!isObject(value)) {
    return false;
  }

  if (
    !hasString(value.quoteId) ||
    !hasString(value.userId) ||
    !hasString(value.requestId) ||
    typeof value.combinable !== "boolean" ||
    !Array.isArray(value.legs)
  ) {
    return false;
  }

  return value.legs.every((leg) => isBetBuilderQuoteLeg(leg));
};

const isFixedExoticQuoteLeg = (
  value: unknown,
): value is FixedExoticQuoteLeg => {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasNumber(value.position) &&
    hasString(value.marketId) &&
    hasString(value.selectionId) &&
    hasString(value.fixtureId) &&
    hasNumber(value.currentOdds)
  );
};

export const isFixedExoticQuoteResponse = (
  value: unknown,
): value is FixedExoticQuoteResponse => {
  if (!isObject(value)) {
    return false;
  }

  if (
    !hasString(value.quoteId) ||
    !hasString(value.userId) ||
    !hasString(value.requestId) ||
    !hasString(value.exoticType) ||
    typeof value.combinable !== "boolean" ||
    !Array.isArray(value.legs)
  ) {
    return false;
  }

  return value.legs.every((leg) => isFixedExoticQuoteLeg(leg));
};

export const isBetBuilderAcceptResponse = (
  value: unknown,
): value is BetBuilderAcceptResponse => {
  if (!isObject(value)) {
    return false;
  }

  if (!isObject(value.bet)) {
    return false;
  }

  return isBetBuilderQuoteResponse(value.quote);
};

export const isFixedExoticAcceptResponse = (
  value: unknown,
): value is FixedExoticAcceptResponse => {
  if (!isObject(value)) {
    return false;
  }

  if (!isObject(value.bet)) {
    return false;
  }

  return isFixedExoticQuoteResponse(value.quote);
};

const isMatchTrackerScore = (value: unknown): value is MatchTrackerScore => {
  if (!isObject(value)) {
    return false;
  }
  return hasNumber(value.home) && hasNumber(value.away);
};

const isMatchTrackerIncident = (
  value: unknown,
): value is MatchTrackerIncident => {
  if (!isObject(value)) {
    return false;
  }

  if (
    !hasString(value.incidentId) ||
    !hasString(value.fixtureId) ||
    !hasString(value.type) ||
    !hasString(value.occurredAt)
  ) {
    return false;
  }

  if (value.period !== undefined && !hasString(value.period)) {
    return false;
  }
  if (value.clockSeconds !== undefined && !hasNumber(value.clockSeconds)) {
    return false;
  }
  if (value.score !== undefined && !isMatchTrackerScore(value.score)) {
    return false;
  }
  if (value.details !== undefined && !isObject(value.details)) {
    return false;
  }

  return true;
};

export const isMatchTrackerTimelineResponse = (
  value: unknown,
): value is MatchTrackerTimelineResponse => {
  if (!isObject(value)) {
    return false;
  }

  if (
    !hasString(value.fixtureId) ||
    !hasString(value.status) ||
    !hasString(value.updatedAt) ||
    !isMatchTrackerScore(value.score) ||
    !Array.isArray(value.incidents)
  ) {
    return false;
  }

  if (value.period !== undefined && !hasString(value.period)) {
    return false;
  }
  if (value.clockSeconds !== undefined && !hasNumber(value.clockSeconds)) {
    return false;
  }

  return value.incidents.every((incident) => isMatchTrackerIncident(incident));
};

const isFixtureStatMetric = (value: unknown): value is FixtureStatMetric => {
  if (!isObject(value)) {
    return false;
  }
  if (!hasNumber(value.home) || !hasNumber(value.away)) {
    return false;
  }
  if (value.unit !== undefined && !hasString(value.unit)) {
    return false;
  }
  return true;
};

export const isFixtureStatsResponse = (
  value: unknown,
): value is FixtureStatsResponse => {
  if (!isObject(value)) {
    return false;
  }

  if (
    !hasString(value.fixtureId) ||
    !hasString(value.status) ||
    !hasString(value.updatedAt) ||
    !isObject(value.metrics)
  ) {
    return false;
  }

  if (value.period !== undefined && !hasString(value.period)) {
    return false;
  }
  if (value.clockSeconds !== undefined && !hasNumber(value.clockSeconds)) {
    return false;
  }

  return Object.values(value.metrics).every((metric) =>
    isFixtureStatMetric(metric),
  );
};

const isFreebetResponse = (value: unknown): value is FreebetResponse => {
  if (!isObject(value)) {
    return false;
  }
  if (
    !hasString(value.freebetId) ||
    !hasString(value.playerId) ||
    !hasString(value.currency) ||
    !hasNumber(value.totalAmountCents) ||
    !hasNumber(value.remainingAmountCents) ||
    !hasString(value.expiresAt) ||
    !hasString(value.status) ||
    !hasString(value.createdAt) ||
    !hasString(value.updatedAt)
  ) {
    return false;
  }
  if (value.campaignId !== undefined && !hasString(value.campaignId)) {
    return false;
  }
  if (value.minOddsDecimal !== undefined && !hasNumber(value.minOddsDecimal)) {
    return false;
  }
  if (
    value.appliesToSportIds !== undefined &&
    (!Array.isArray(value.appliesToSportIds) ||
      !value.appliesToSportIds.every((item) => hasString(item)))
  ) {
    return false;
  }
  if (
    value.appliesToTournamentIds !== undefined &&
    (!Array.isArray(value.appliesToTournamentIds) ||
      !value.appliesToTournamentIds.every((item) => hasString(item)))
  ) {
    return false;
  }
  return true;
};

export const isFreebetListResponse = (
  value: unknown,
): value is FreebetListResponse => {
  if (!isObject(value)) {
    return false;
  }
  if (!Array.isArray(value.items) || !hasNumber(value.totalCount)) {
    return false;
  }
  return value.items.every((item) => isFreebetResponse(item));
};

const isOddsBoostResponse = (value: unknown): value is OddsBoostResponse => {
  if (!isObject(value)) {
    return false;
  }
  if (
    !hasString(value.oddsBoostId) ||
    !hasString(value.playerId) ||
    !hasString(value.marketId) ||
    !hasString(value.selectionId) ||
    !hasString(value.currency) ||
    !hasNumber(value.originalOdds) ||
    !hasNumber(value.boostedOdds) ||
    !hasString(value.status) ||
    !hasString(value.expiresAt) ||
    !hasString(value.createdAt) ||
    !hasString(value.updatedAt)
  ) {
    return false;
  }
  if (value.campaignId !== undefined && !hasString(value.campaignId)) {
    return false;
  }
  if (value.maxStakeCents !== undefined && !hasNumber(value.maxStakeCents)) {
    return false;
  }
  if (value.minOddsDecimal !== undefined && !hasNumber(value.minOddsDecimal)) {
    return false;
  }
  if (value.acceptedAt !== undefined && !hasString(value.acceptedAt)) {
    return false;
  }
  if (
    value.acceptRequestId !== undefined &&
    !hasString(value.acceptRequestId)
  ) {
    return false;
  }
  if (value.acceptReason !== undefined && !hasString(value.acceptReason)) {
    return false;
  }
  return true;
};

export const isOddsBoostListResponse = (
  value: unknown,
): value is OddsBoostListResponse => {
  if (!isObject(value)) {
    return false;
  }
  if (!Array.isArray(value.items) || !hasNumber(value.totalCount)) {
    return false;
  }
  return value.items.every((item) => isOddsBoostResponse(item));
};
