import { goApi } from "../client";
import type {
  GoPlaceBetRequest,
  GoPlaceBetResponse,
  GoPlaceParlayRequest,
  GoPlaceParlayResponse,
  GoUserBetsQuery,
  GoUserBetsResponse,
  GoBetDetail,
  GoCashoutRequest,
  GoCashoutResponse,
  GoCashoutOffer,
  GoPrecheckRequest,
  GoPrecheckResponse,
  GoBetStatusRequest,
  GoBetStatusResponse,
} from "./betting-types";

/** Place a single bet. */
export async function placeBet(
  request: GoPlaceBetRequest,
): Promise<GoPlaceBetResponse> {
  const { data } = await goApi.post<GoPlaceBetResponse>(
    "/api/v1/bets",
    request,
  );
  return data;
}

/** Place a parlay (multi-leg) bet. */
export async function placeParlay(
  request: GoPlaceParlayRequest,
): Promise<GoPlaceParlayResponse> {
  const { data } = await goApi.post<GoPlaceParlayResponse>(
    "/api/v1/parlays",
    request,
  );
  return data;
}

/** Get bets for a user. */
export async function getUserBets(
  userId: string,
  query?: GoUserBetsQuery,
): Promise<GoUserBetsResponse> {
  const { data } = await goApi.get<GoUserBetsResponse>(
    `/api/v1/users/${userId}/bets`,
    { params: query },
  );
  return data;
}

/** Get a single bet by ID. */
export async function getBet(betId: string): Promise<GoBetDetail> {
  const { data } = await goApi.get<GoBetDetail>(`/api/v1/bets/${betId}`);
  return data;
}

/** Cash out a bet. */
export async function cashoutBet(
  betId: string,
  request: GoCashoutRequest,
): Promise<GoCashoutResponse> {
  const { data } = await goApi.post<GoCashoutResponse>(
    `/api/v1/bets/${betId}/cashout`,
    request,
  );
  return data;
}

/** Get cashout offer for a bet. */
export async function getCashoutOffer(betId: string): Promise<GoCashoutOffer> {
  const { data } = await goApi.get<GoCashoutOffer>(
    `/api/v1/bets/${betId}/cashout-offer`,
  );
  return data;
}

/** Precheck bets before placement. */
export async function precheckBets(
  request: GoPrecheckRequest,
): Promise<GoPrecheckResponse> {
  const { data } = await goApi.post<GoPrecheckResponse>(
    "/api/v1/bets/precheck",
    request,
  );
  return data;
}

/** Get statuses for multiple bets. */
export async function getBetStatuses(
  request: GoBetStatusRequest,
): Promise<GoBetStatusResponse> {
  const { data } = await goApi.post<GoBetStatusResponse>(
    "/api/v1/bets/status",
    request,
  );
  return data;
}
