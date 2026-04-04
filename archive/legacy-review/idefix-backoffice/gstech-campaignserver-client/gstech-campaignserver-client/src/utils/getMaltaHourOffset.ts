import { MALTA_TIMEZONE } from "./constants";
import { getTimezoneOffset } from "date-fns-tz";

export function getMaltaHourOffset(date?: Date | number): number {
  if (date) return getTimezoneOffset(MALTA_TIMEZONE, date) / 3600000;
  return getTimezoneOffset(MALTA_TIMEZONE) / 3600000;
}
