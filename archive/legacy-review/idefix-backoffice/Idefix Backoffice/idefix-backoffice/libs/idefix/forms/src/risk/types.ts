import { Risk, RiskRole, RiskType } from "@idefix-backoffice/idefix/types";

export type RiskFormValues = {
  type: RiskType | "";
  fraudKey: string;
  points: number;
  maxCumulativePoints: number;
  requiredRole: RiskRole | "";
  active: "true" | "false";
  name: string;
  title: string;
  description: string;
  manualTrigger: boolean;
};

type Modify<T, R> = Omit<T, keyof R> & R;

export type EditRiskFormValues = Modify<Risk, { active: string }>;
