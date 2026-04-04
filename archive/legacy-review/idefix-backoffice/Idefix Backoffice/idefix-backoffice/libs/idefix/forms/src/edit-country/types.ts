import { RiskProfile } from "@idefix-backoffice/idefix/types";

export type EditCountryFormValues = {
  monthlyIncomeThreshold: null | number;
  id: string;
  name: string;
  minimumAge: boolean;
  registrationAllowed: boolean;
  loginAllowed: boolean;
  blocked: boolean;
  riskProfile: RiskProfile;
};
