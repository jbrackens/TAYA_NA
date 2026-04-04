import moment from "moment-timezone";

export const formatPendingTime = (timestamp: string): string => {
  const now = moment();
  const pending = moment(timestamp);
  const diff = now.diff(pending);
  const duration = moment.duration(diff);
  const asHours = Math.floor(duration.asHours());
  const minutes = duration.minutes();

  return `${Math.abs(asHours) - 1}h ${Math.abs(minutes)}m`;
};
