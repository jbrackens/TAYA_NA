import { useMessages } from "./useMessages";
import { LimitPeriodType } from "@brandserver-client/types";

export const useLimitPeriodTranslation = (
  limitPeriodType?: LimitPeriodType
): string => {
  const messages = useMessages({
    day: "selfexclusion.confirmation.day",
    week: "selfexclusion.confirmation.week",
    month: "selfexclusion.confirmation.month"
  });

  if (limitPeriodType === "daily") return messages.day;
  if (limitPeriodType === "weekly") return messages.week;
  if (limitPeriodType === "monthly") return messages.month;
  return "";
};
