import { isDate } from "lodash";
import { format } from "date-fns";

export const getValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (isDate(value)) return format(value, "dd.MM.yyyy");
  return "";
};
