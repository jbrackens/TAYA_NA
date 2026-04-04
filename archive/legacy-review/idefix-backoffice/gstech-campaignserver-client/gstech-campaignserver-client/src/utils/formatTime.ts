import set from "date-fns/set";
import formatISO from "date-fns/formatISO";

export default function (sendingTime: string | null | Date) {
  if (!sendingTime) {
    return sendingTime;
  }

  const [hours, minutes] = sendingTime.toString().split(":");
  const formattedDate = set(new Date(), { hours: Number(hours), minutes: Number(minutes) });

  return formatISO(formattedDate);
}
