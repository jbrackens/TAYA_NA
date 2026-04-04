import { isString } from "lodash";
import dayjs from "dayjs";

export const toMillisecondsTimestamp = (exp: number): number => exp * 1000;

export const appendSecondsToTimestamp = (
  seconds: number | string,
  timestamp: number = dayjs().valueOf(),
): number =>
  dayjs(timestamp)
    .add(isString(seconds) ? parseInt(seconds, 10) : seconds, "second")
    .valueOf();

export const enumToObject = (structure: any) => {
  const keys = Object.keys(structure);
  const values = Object.values(structure);
  return keys.reduce(
    (prev: any, curr: any) => ({
      ...prev,
      [curr]: values[keys.indexOf(curr)],
    }),
    {},
  );
};

export const inverseEnum = (structure: any): { [key: string]: any } =>
  Object.keys(enumToObject(structure)).reduce(
    (prev, curr) => ({
      ...prev,
      [structure[curr]]: curr,
    }),
    {},
  );

export const numberToHours = (
  value: number,
  unit: string = "hour",
  separator: string = " ",
): string => {
  const hours = Math.floor(value);
  const minutes = Math.floor((value - hours) * 60);
  const minutesWithLeadingZero = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutesWithLeadingZero}${separator}${unit}`;
};

export const hoursToNumber = (
  stringValue: string,
  unit: string = "hour",
): number => {
  const value = stringValue.replace(unit, "").trim();
  const [hours, minutes] = value.split(":");
  return parseInt(hours, 10) + parseInt(minutes, 10) / 60;
};
