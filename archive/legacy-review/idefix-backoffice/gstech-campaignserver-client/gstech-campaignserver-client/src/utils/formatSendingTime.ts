import omitBy from "lodash/omitBy";
import isNil from "lodash/isNil";
import { format } from "date-fns-tz";
import { MALTA_TIMEZONE } from "./constants";
interface IValues {
  sendingTime?: string;
  contentId: number;
}

const formatToMaltaTime = (date: Date) => format(date, "HH:mm:ssx", { timeZone: MALTA_TIMEZONE });

export default function (values: IValues) {
  const clearValues = omitBy(values, isNil) as IValues;

  if (clearValues.sendingTime) {
    const sendingTime = new Date(clearValues.sendingTime);
    clearValues.sendingTime = formatToMaltaTime(sendingTime);
  }

  return clearValues;
}
