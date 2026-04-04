import { goApi } from "../client";
import type {
  GoFreebet,
  GoFreebetsResponse,
  GoOddsBoost,
  GoOddsBoostsResponse,
  GoAcceptOddsBoostResponse,
} from "./retention-types";

/** Get freebets for a user. */
export async function getFreebets(
  userId: string,
  status?: string,
): Promise<GoFreebetsResponse> {
  const { data } = await goApi.get<GoFreebetsResponse>(
    "/api/v1/freebets",
    { params: { userId, status } },
  );
  return data;
}

/** Get a single freebet by ID. */
export async function getFreebet(freebetId: string): Promise<GoFreebet> {
  const { data } = await goApi.get<GoFreebet>(
    `/api/v1/freebets/${freebetId}`,
  );
  return data;
}

/** Get odds boosts for a user. */
export async function getOddsBoosts(
  userId: string,
  status?: string,
): Promise<GoOddsBoostsResponse> {
  const { data } = await goApi.get<GoOddsBoostsResponse>(
    "/api/v1/odds-boosts",
    { params: { userId, status } },
  );
  return data;
}

/** Get a single odds boost by ID. */
export async function getOddsBoost(oddsBoostId: string): Promise<GoOddsBoost> {
  const { data } = await goApi.get<GoOddsBoost>(
    `/api/v1/odds-boosts/${oddsBoostId}`,
  );
  return data;
}

/** Accept an odds boost. */
export async function acceptOddsBoost(
  oddsBoostId: string,
  userId: string,
): Promise<GoAcceptOddsBoostResponse> {
  const { data } = await goApi.post<GoAcceptOddsBoostResponse>(
    `/api/v1/odds-boosts/${oddsBoostId}/accept`,
    { userId },
  );
  return data;
}
