import { RiskProfile } from "@idefix-backoffice/idefix/types";

export type GameProfileFormValues = {
  name: string;
  wageringMultiplier: string | number;
  riskProfile: RiskProfile;
};
