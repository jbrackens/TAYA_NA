import { isString, get, isEmpty, isNil } from "lodash";
import {
  FetchError,
  FetchErrorStatusCode,
  FetchErrorStatusCodeEnum,
  FetchErrorStatusKeyEnum,
} from "../types/error";
import { enumToObject, inverseEnum } from "../converters";

const transformTextToJSON = (text: string, props: any): FetchError => {
  const { status } = props;
  const regexp = RegExp("<body>(?:.+)</body>", "imgs");
  const [match] = text.replace(/[\n\r\s\t]+/g, " ").match(regexp) || [];
  const plainText = (match || "")
    .replace(/<\s*br[^>]?>/, "")
    .replace(/(<([^>]+)>)/g, "")
    .trim()
    .replace(/  /g, ". ");
  return {
    statusCode: status,
    statusKey: resolveErrorStatus(status),
    message: match ? plainText : text,
  } as FetchError;
};

const resolveErrorStatus = (code: FetchErrorStatusCode): string => {
  const codes = inverseEnum(FetchErrorStatusCodeEnum);
  const keys = enumToObject(FetchErrorStatusKeyEnum);
  const resolvedKey = codes[`${code}`];
  return resolvedKey ? keys[resolvedKey] : keys["UNEXPECTED"];
};

export const transformError = (response: any): FetchError => {
  const { data, status } = response;
  if (isString(data)) {
    return transformTextToJSON(data, response);
  }

  const statusCode = data?.statusCode || status;
  const { message, ...rest } = data || {};

  const fetchError = {
    payload:
      !isEmpty(rest) && !isNil(rest)
        ? {
            ...rest,
          }
        : {
            errors: [
              {
                errorCode: "unexpectedError",
              },
            ],
          },
    message,
    statusCode,
    statusKey: resolveErrorStatus(statusCode),
  } as FetchError;

  return Object.keys(fetchError)
    .filter((key: string) => get(fetchError, key))
    .reduce(
      (prev: FetchError, curr: string) => ({
        ...prev,
        [curr]: get(fetchError, curr),
      }),
      {} as FetchError,
    );
};
