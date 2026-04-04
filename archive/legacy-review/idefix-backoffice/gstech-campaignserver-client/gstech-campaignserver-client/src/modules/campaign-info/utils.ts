import parseISO from "date-fns/parseISO";
import compareAsc from "date-fns/compareAsc";
import { MALTA_TIMEZONE } from "../../utils/constants";
import { formatISO } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

export function isTimePast(endDate: string) {
  const currentDate = new Date();

  const result = compareAsc(currentDate, parseISO(endDate));
  // returns 1 if the first date is after the second
  //        -1 if the first date is before the second
  //         0 if dates are equal
  //
  if (result === 1) return true;
  return false;
}

export function formatToMaltaTz(time: string) {
  return formatISO(utcToZonedTime(time, MALTA_TIMEZONE));
}
