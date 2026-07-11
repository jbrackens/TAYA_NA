"use client";

import type {
  Category,
  PredictionMarket,
} from "@taptrade-ui/api-client/src/prediction-types";
import i18n from "../../lib/i18n/config";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function emptyFallback(value: string): string {
  return value.trim();
}

function currentLocale(): string {
  // The user's CHOSEN language gates template localization — not
  // resolvedLanguage, which falls back to "en" while a locale's
  // namespaces are still fetching (P10: en resources are bundled at
  // init, so resolvedLanguage is briefly "en" after every language
  // switch until the fetch backend delivers).
  return i18n.language || i18n.resolvedLanguage || "en";
}

function usesEnglishCopy(): boolean {
  return currentLocale().toLowerCase().startsWith("en");
}

function localizedCopy(
  market: PredictionMarket,
  field: "title" | "description",
): string | undefined {
  const translations = market.translations;
  if (!translations) return undefined;

  const locale = currentLocale();
  const candidates = [locale, locale.split("-")[0]].filter(Boolean);

  for (const candidate of candidates) {
    const value = translations[candidate]?.[field]?.trim();
    if (value) return value;
  }
  return undefined;
}

function staticCopy(
  t: Translate,
  market: PredictionMarket,
  field: "title" | "description",
): string | undefined {
  const fallback = field === "title" ? market.title : market.description;
  if (!fallback) return undefined;
  const trimmedFallback = emptyFallback(fallback);

  const value = emptyFallback(
    t(`markets.${market.ticker}.${field}`, { defaultValue: fallback }),
  );
  return value && value !== trimmedFallback ? value : undefined;
}

interface WinCompetitionTemplate {
  team: string;
  year: string;
  competition: string;
}

function matchWinCompetition(title: string): WinCompetitionTemplate | null {
  const match = /^Will (?:the )?(.+?) win the (\d{4}) (.+?)\?$/i.exec(
    title.trim(),
  );
  if (!match) return null;
  return {
    team: match[1].trim(),
    year: match[2],
    competition: match[3].trim(),
  };
}

function templateCopy(
  t: Translate,
  market: PredictionMarket,
  field: "title" | "description",
): string | undefined {
  if (usesEnglishCopy()) return undefined;
  if (field === "description" && !market.description) return undefined;

  const winCompetition = matchWinCompetition(market.title);
  if (!winCompetition) return undefined;

  const competition = emptyFallback(
    t(`competitions.${winCompetition.competition}`, {
      defaultValue: winCompetition.competition,
    }),
  );
  const key = `templates.winCompetition.${field}`;
  const value = emptyFallback(
    t(key, {
      defaultValue: "",
      team: winCompetition.team,
      year: winCompetition.year,
      competition,
    }),
  );

  if (!value || value === key) return undefined;
  return value;
}

export function marketTitle(t: Translate, market: PredictionMarket): string {
  const apiTitle = localizedCopy(market, "title");
  if (apiTitle) return apiTitle;

  const bundledTitle = staticCopy(t, market, "title");
  if (bundledTitle) return bundledTitle;

  const templatedTitle = templateCopy(t, market, "title");
  if (templatedTitle) return templatedTitle;

  return emptyFallback(market.title);
}

export function marketDescription(
  t: Translate,
  market: PredictionMarket,
): string | undefined {
  if (!market.description) return undefined;
  const apiDescription = localizedCopy(market, "description");
  if (apiDescription) return apiDescription;

  const bundledDescription = staticCopy(t, market, "description");
  if (bundledDescription) return bundledDescription;

  const templatedDescription = templateCopy(t, market, "description");
  if (templatedDescription) return templatedDescription;

  return emptyFallback(market.description);
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
