type SentimentState = "yes" | "no" | "neutral";
type SentimentTranslationKey =
  | "MARKET_SENTIMENT_STRONG_DOUBT"
  | "MARKET_SENTIMENT_LEANING_NO"
  | "MARKET_SENTIMENT_SPLIT_ROOM"
  | "MARKET_SENTIMENT_LEANING_YES"
  | "MARKET_SENTIMENT_HEAVY_BACKING";

interface SentimentOutput {
  displayStringKey: SentimentTranslationKey;
  percentage?: number;
  sentimentState: SentimentState;
}

const NEUTRAL_OUTPUT: SentimentOutput = {
  displayStringKey: "MARKET_SENTIMENT_SPLIT_ROOM",
  sentimentState: "neutral",
};

export const calculateMarketSentiment = (
  yesPercentage: number,
): SentimentOutput => {
  if (!Number.isFinite(yesPercentage)) {
    return NEUTRAL_OUTPUT;
  }

  const clampedYes = Math.max(0, Math.min(100, Math.round(yesPercentage)));

  if (clampedYes >= 45 && clampedYes <= 55) {
    return NEUTRAL_OUTPUT;
  }

  if (clampedYes > 55) {
    return {
      displayStringKey:
        clampedYes >= 75
          ? "MARKET_SENTIMENT_HEAVY_BACKING"
          : "MARKET_SENTIMENT_LEANING_YES",
      percentage: clampedYes,
      sentimentState: "yes",
    };
  }

  const noPercentage = 100 - clampedYes;
  return {
    displayStringKey:
      clampedYes <= 25
        ? "MARKET_SENTIMENT_STRONG_DOUBT"
        : "MARKET_SENTIMENT_LEANING_NO",
    percentage: noPercentage,
    sentimentState: "no",
  };
};
