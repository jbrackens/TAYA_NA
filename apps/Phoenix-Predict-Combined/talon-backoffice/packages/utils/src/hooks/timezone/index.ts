import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useLocalStorageVariables } from "../../services/local-storage-variables-store/local-storage-variables-store-service";
dayjs.extend(utc);
dayjs.extend(LocalizedFormat);
dayjs.extend(timezone);

const useTimezoneHook = (timezone: string | undefined) => {
  timezone = timezone ? timezone : dayjs.tz.guess();

  const getTimeWithTimezone = (time?: string | Date | dayjs.Dayjs) =>
    time !== undefined ? dayjs(time).tz(timezone) : dayjs().tz(timezone);

  return { getTimeWithTimezone };
};

export const useTimezone = () => {
  const { getTimezone } = useLocalStorageVariables();
  const currentTimezone =
    typeof localStorage !== "undefined" ? getTimezone() : undefined;

  return useTimezoneHook(currentTimezone);
};
