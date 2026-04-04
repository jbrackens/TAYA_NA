export type Jurisdiction = "MGA" | "GNRS";

export type CurrencyISO = "EUR" | "SEK" | "NOK" | "CAD" | "USD" | "GBP" | "INR";

export type Brand = "LD" | "KK" | "CJ" | "OS" | "FK" | "SN" | "VB";

export type LimitPeriodType = "daily" | "weekly" | "monthly" | null;

export type LimitLength = 0 | 1 | 7 | 30;

export type SubscriptionType = "all" | "best_offers" | "new_games" | "none";

export type LimitTypes =
  | "loss"
  | "deposit"
  | "play"
  | "timeout"
  | "pause"
  | "bet";

export type CategoryTags =
  | "all"
  | "jackpot"
  | "live"
  | "new"
  | "videoslot"
  | "tablegame"
  | "promo"
  | "sports";

export interface Subscription {
  "unsubscribed-sms": boolean;
  "unsubscribed-general": boolean;
  "unsubscribed-personal": boolean;
  "unsubscribed-special": boolean;
}

export type DepositOptionIcon =
  | "coins"
  | "bounty"
  | "reward"
  | "freespin"
  | "wheel";
