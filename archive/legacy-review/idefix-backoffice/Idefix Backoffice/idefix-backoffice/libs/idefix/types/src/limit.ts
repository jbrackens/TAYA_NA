export type LimitType = "selfExclusion" | "deposit" | "bet" | "loss" | "sessionLength" | "timeout";

export interface ActiveLimit {
  id: number;
  createdAt: string;
  expires: string;
  permanent: string;
  exclusionKey: string;
  type: LimitType;
  limitValue: number;
  limit: number;
  amount: string;
  periodType: string;
  reason: string;
  isInternal: boolean;
  display: string;
  canBeCancelled: boolean;
  cancellationDays: number;
}

export interface LimitHistory {
  type: string;
  periodType: string;
  status: string;
  startTime: string;
  endTime: string;
  amount: string;
  reason: string;
  isInternal: boolean;
}

export type ActiveLimitOptions = Record<LimitType, ActiveLimit>;

export type PeriodType = "daily" | "weekly" | "monthly";

export interface CancelLimitResponse {
  playerId: number;
  expires: string;
  exclusionKey: string;
}

export interface CancelLimitAdditionalResponse {
  playerId: number;
  cancelled: string;
}

export interface CancelLimitValues {
  reason: string;
}
