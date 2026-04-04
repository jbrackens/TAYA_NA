export type RiskProfile = "low" | "medium_low" | "medium" | "medium_high" | "high";

export type RiskType = "customer" | "transaction" | "interface" | "geo";

export type RiskRole = "administrator" | "riskManager" | "payments" | "agent";

export interface RiskDraft {
  type: RiskType;
  fraudKey: string;
  points: number;
  maxCumulativePoints: number;
  requiredRole: RiskRole;
  active: boolean;
  name: string;
  title: string;
  description: string;
  manualTrigger: boolean;
}

export interface Risk extends RiskDraft {
  id: number;
  riskProfiles: string[];
  manualCheck: boolean;
}

export interface RiskStatus {
  fraudKey: string;
  name: string;
  count: number;
  contribution: number;
  latestOccurrence: string;
}

export interface RiskLog {
  id: number;
  createdAt: string;
  fraudKey: string;
  name: string;
  points: number;
  handle: string;
}
