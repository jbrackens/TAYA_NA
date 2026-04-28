import {
  TalonPunterActivityEnum,
  TalonPunterRecentActivityItem,
} from "../../types/punters";

type GoTimelineEntry = {
  entry_id?: string;
  entry_type?: string;
  occurred_at?: string;
  title?: string;
  description?: string;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  metadata?: Record<string, any>;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "$",
  CAD: "$",
  EUR: "EUR ",
  GBP: "£",
  USD: "$",
};

const SYSTEM_FALLBACK_LABEL = "system";

const isLegacyRecentActivity = (
  item: any,
): item is TalonPunterRecentActivityItem =>
  typeof item?.id !== "undefined" &&
  typeof item?.date === "string" &&
  typeof item?.type === "string" &&
  typeof item?.message === "string";

const extractTimelineEntries = (payload: any): any[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
};

const normalizeCurrency = (currency?: string | null): string => {
  if (!currency) {
    return "";
  }
  const normalizedCurrency = currency.trim().toUpperCase();
  return CURRENCY_SYMBOLS[normalizedCurrency] || `${normalizedCurrency} `;
};

const normalizeAmount = (
  amount?: string | number | null,
): string | number | undefined => {
  if (typeof amount === "number" && Number.isFinite(amount)) {
    return Math.abs(amount);
  }
  if (typeof amount === "string") {
    const trimmedAmount = amount.trim();
    const numericAmount = Number(trimmedAmount);
    if (trimmedAmount && Number.isFinite(numericAmount)) {
      return Math.abs(numericAmount);
    }
    return trimmedAmount || undefined;
  }
  return undefined;
};

const resolveTimelineType = (
  entry: GoTimelineEntry,
): TalonPunterActivityEnum => {
  const normalizedEntryType = `${entry.entry_type || ""}`.toLowerCase();
  const normalizedStatus = `${entry.status || ""}`.toLowerCase();
  const amount = Number(entry.amount);

  if (normalizedEntryType === "wallet_transaction") {
    return amount > 0
      ? TalonPunterActivityEnum.BET_WON
      : TalonPunterActivityEnum.BET_PLACEMENT;
  }

  if (normalizedEntryType === "bet") {
    return normalizedStatus === "won"
      ? TalonPunterActivityEnum.BET_WON
      : TalonPunterActivityEnum.BET_PLACEMENT;
  }

  return TalonPunterActivityEnum.SYSTEM_LOGIN;
};

const buildMessage = (entry: GoTimelineEntry): string => {
  const title = `${entry.title || ""}`.trim();
  const description = `${entry.description || ""}`.trim();

  if (title && description && title !== description) {
    return `${title} - ${description}`;
  }

  return title || description || SYSTEM_FALLBACK_LABEL;
};

const buildSystemLabel = (entry: GoTimelineEntry): string => {
  const metadata = entry.metadata || {};
  return (
    metadata.ip ||
    metadata.ipAddress ||
    metadata.providerDecision ||
    metadata.requiredAction ||
    metadata.status ||
    `${entry.entry_type || ""}`.replace(/_/g, " ").trim() ||
    SYSTEM_FALLBACK_LABEL
  );
};

const normalizeTimelineEntry = (
  entry: GoTimelineEntry,
): TalonPunterRecentActivityItem => {
  const type = resolveTimelineType(entry);

  return {
    id:
      entry.entry_id ||
      `${entry.entry_type || SYSTEM_FALLBACK_LABEL}:${entry.occurred_at || "0"}`,
    date: entry.occurred_at || new Date(0).toISOString(),
    type,
    message: buildMessage(entry),
    data:
      type === TalonPunterActivityEnum.SYSTEM_LOGIN
        ? {
            ip: buildSystemLabel(entry),
          }
        : {
            unit: normalizeCurrency(entry.currency),
            amount: normalizeAmount(entry.amount),
          },
  };
};

export const normalizeRecentActivities = (
  payload: any,
): TalonPunterRecentActivityItem[] =>
  extractTimelineEntries(payload).map((entry) =>
    isLegacyRecentActivity(entry)
      ? entry
      : normalizeTimelineEntry(entry as GoTimelineEntry),
  );
