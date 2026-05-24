"use client";

import type {
  Category,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function emptyFallback(value: string): string {
  return value.trim();
}

export function marketTitle(t: Translate, market: PredictionMarket): string {
  return emptyFallback(
    t(`markets.${market.ticker}.title`, { defaultValue: market.title }),
  );
}

export function marketDescription(
  t: Translate,
  market: PredictionMarket,
): string | undefined {
  if (!market.description) return undefined;
  return emptyFallback(
    t(`markets.${market.ticker}.description`, {
      defaultValue: market.description,
    }),
  );
}

export function localizedMarket(
  t: Translate,
  market: PredictionMarket,
): PredictionMarket {
  return {
    ...market,
    title: marketTitle(t, market),
    description: marketDescription(t, market),
  };
}

export function categoryName(t: Translate, category: Category): string {
  return emptyFallback(
    t(`categories.${category.slug}`, { defaultValue: category.name }),
  );
}

export function categoryLabel(t: Translate, slugOrName?: string): string {
  if (!slugOrName) return "";
  const key = slugOrName.toLowerCase().replace(/\s+/g, "-");
  return emptyFallback(t(`categories.${key}`, { defaultValue: slugOrName }));
}
