import { AudienceRule } from "app/types";

export interface IFormValues {
  name: string;
  operator: AudienceRule["operator"];
  values: any;
  negated: "is" | "not";
}
