type SentimentState = "yes" | "no" | "neutral";

interface SentimentOutput {
  displayString: string;
  sentimentState: SentimentState;
}

const NEUTRAL_OUTPUT: SentimentOutput = {
  displayString: "Split Room • 50/50 Toss-up",
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
    const descriptor = clampedYes >= 75 ? "Heavy Backing" : "Leaning Yes";
    return {
      displayString: `${descriptor} • ${clampedYes}% say Yes`,
      sentimentState: "yes",
    };
  }

  const noPercentage = 100 - clampedYes;
  const descriptor = clampedYes <= 25 ? "Strong Doubt" : "Leaning No";
  return {
    displayString: `${descriptor} • ${noPercentage}% say No`,
    sentimentState: "no",
  };
};
