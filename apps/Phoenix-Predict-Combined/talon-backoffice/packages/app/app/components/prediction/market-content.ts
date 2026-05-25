"use client";

import type {
  Category,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";
import i18n from "../../lib/i18n/config";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function emptyFallback(value: string): string {
  return value.trim();
}

function localizedCopy(
  market: PredictionMarket,
  field: "title" | "description",
): string | undefined {
  const translations = market.translations;
  if (!translations) return undefined;

  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const candidates = [locale, locale.split("-")[0]].filter(Boolean);

  for (const candidate of candidates) {
    const value = translations[candidate]?.[field]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function marketTitle(t: Translate, market: PredictionMarket): string {
  const apiTitle = localizedCopy(market, "title");
  if (apiTitle) return apiTitle;

  return emptyFallback(
    t(`markets.${market.ticker}.title`, { defaultValue: market.title }),
  );
}

export function marketDescription(
  t: Translate,
  market: PredictionMarket,
): string | undefined {
  if (!market.description) return undefined;
  const apiDescription = localizedCopy(market, "description");
  if (apiDescription) return apiDescription;

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
