import { MALTA_TIMEZONE } from "./constants";

export default function (date: Date) {
  return date.toLocaleString("en-US", { timeZone: MALTA_TIMEZONE, timeZoneName: "short" });
}
