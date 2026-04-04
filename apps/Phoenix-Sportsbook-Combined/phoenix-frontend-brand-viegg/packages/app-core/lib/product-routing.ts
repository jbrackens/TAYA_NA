export type PlayerProduct = "sportsbook" | "prediction";

export const SPORTSBOOK_HOME_PATH = "/sports/home";
export const PREDICTION_HOME_PATH = "/prediction";

export const isPredictionRoutePath = (pathname: string): boolean =>
  `${pathname || ""}`.startsWith("/prediction");

export const isSportsbookRoutePath = (pathname: string): boolean =>
  `${pathname || ""}`.startsWith("/sports") ||
  `${pathname || ""}`.startsWith("/esports-bets");

export const resolvePlayerProductFromPath = (
  pathname: string,
): PlayerProduct => {
  if (isPredictionRoutePath(pathname)) {
    return "prediction";
  }
  return "sportsbook";
};

export const buildProductHomePath = (product: PlayerProduct): string =>
  product === "prediction" ? PREDICTION_HOME_PATH : SPORTSBOOK_HOME_PATH;

export const buildPredictionCategoryPath = (categoryKey: string): string =>
  `/prediction/categories/${encodeURIComponent(`${categoryKey || "all"}`.trim())}`;

export const buildPredictionMarketsPath = (): string => "/prediction/markets";

export const buildPredictionActivityPath = (): string => "/prediction/activity";

export const buildPredictionMarketPath = (marketId: string): string =>
  `/prediction/markets/${encodeURIComponent(`${marketId || ""}`.trim())}`;
