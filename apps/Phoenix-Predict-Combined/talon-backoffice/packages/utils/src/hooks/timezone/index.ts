import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useEffect, useState } from "react";
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
  // Defer the saved (localStorage) timezone until after mount so the first
  // client render matches the server: both fall back to dayjs.tz.guess(),
  // which resolves identically on the same machine. Reading the saved TZ during
  // the first render formats every dated cell in a different zone than the
  // server emitted, tripping a hydration mismatch on every admin table.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currentTimezone =
    mounted && typeof localStorage !== "undefined" ? getTimezone() : undefined;

  return useTimezoneHook(currentTimezone);
};
