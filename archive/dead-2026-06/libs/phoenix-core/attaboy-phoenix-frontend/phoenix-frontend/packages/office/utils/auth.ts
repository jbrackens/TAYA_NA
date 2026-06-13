const {
  API_GLOBAL_ENDPOINT,
} = require("next/config").default().publicRuntimeConfig;
import Router from "next/router";
import { NextPageContext } from "next";
import {
  useToken,
  appendSecondsToTimestamp,
  Method,
  PunterRoles,
  JSONWebToken,
} from "@phoenix-ui/utils";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import { isEmpty } from "lodash";

export const ROUTE_AUTH = "/auth";
export const ROUTE_NOT_AUTHORIZED = "/not-authorized";

export const auth = async (
  ctx: NextPageContext,
  eligibleRoles: PunterRoles = [],
) => {
  if (!ctx || !ctx.req) {
    return validateSession(eligibleRoles);
  }
};

const callRefreshToken = async (refreshToken: string) => {
  const refreshResponse = await fetch(`${API_GLOBAL_ENDPOINT}/token/refresh`, {
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
    method: Method.POST,
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Authorization: `Bearer ${refreshToken}`,
    },
  });
  try {
    if (refreshResponse.ok) {
      return refreshResponse.json();
    }
    throw refreshResponse;
  } catch (e) {
    throw refreshResponse;
  }
};

export const validateSession = async (
  eligibleRoles: PunterRoles = [],
): Promise<string | null> => {
  const token = resolveToken();
  const refreshToken = resolveRefreshToken();
  const validatedToken = validateAndDecode(token);
  const currentPath = Router.asPath;
  if (token && !validatedToken) {
    try {
      return extendAuthSession(refreshToken);
    } catch (e) {
      Router.push(buildRedirectUrl(currentPath));
    }
  } else {
    if (!token || !validatedToken) {
      Router.push(buildRedirectUrl(currentPath));
    }
    if (
      !isEmpty(eligibleRoles) &&
      !isEligibleToAccess(validatedToken, eligibleRoles)
    ) {
      Router.push(ROUTE_NOT_AUTHORIZED);
    }
  }
  return token;
};

export const extendAuthSession = async (
  currentRefreshToken: string,
): Promise<string | null> => {
  let refreshData;
  try {
    refreshData = await callRefreshToken(currentRefreshToken);
  } catch (e) {
    return null;
  }
  const { token, refreshToken, expiresIn, refreshExpiresIn } = refreshData;
  const { saveToken, saveTokenExpDate } = useToken();
  if (token) {
    const now = dayjs().valueOf();
    saveToken(token, refreshToken);
    saveTokenExpDate(
      appendSecondsToTimestamp(expiresIn, now),
      appendSecondsToTimestamp(refreshExpiresIn, now),
    );
    return token;
  }
  return null;
};

export const clientNukeAuth = (withRedirect: boolean = true) =>
  nukeAuth(null, withRedirect);

export const nukeAuth = (
  ctx?: NextPageContext | null,
  withRedirect: boolean = false,
) => {
  if (ctx?.req) {
    withRedirect && serverRedirect(ctx, ROUTE_AUTH);
  } else {
    const {
      clearToken,
      clearRefreshToken,
      clearRefreshTokenExpDate,
      clearTokenExpDate,
    } = useToken();
    try {
      clearToken();
      clearRefreshToken();
      clearTokenExpDate();
      clearRefreshTokenExpDate();
    } catch (e) {}
    withRedirect
      ? Router.push(buildRedirectUrl(Router.asPath))
      : Router.push(ROUTE_AUTH);
  }
};

export const securedPage = (
  ctx: NextPageContext,
  payload: any,
  eligibleRoles: PunterRoles = [],
) => (!auth(ctx, eligibleRoles) ? {} : payload);

export const resolveToken = (): string => {
  if (process.browser) {
    const { getToken } = useToken();
    const token = getToken() as string;
    return parseToken(token);
  }
  return "";
};

export const resolveRefreshToken = (): string => {
  if (process.browser) {
    const { getRefreshToken } = useToken();
    const token = getRefreshToken() as string;
    return parseToken(token);
  }
  return "";
};

const parseToken = (token: string) => {
  let parsedToken;
  try {
    parsedToken = JSON.parse(token);
  } catch (e) {
    parsedToken = token || "";
  }
  return parsedToken;
};

export const serverRedirect = (ctx: NextPageContext, path: string) => {
  if (ctx.res && ctx.res.writeHead) {
    ctx.res.writeHead(302, { Location: path });
    ctx.res.end();
  }
  return;
};

export const validateAndDecode = (
  token: string | undefined,
): JSONWebToken | null => {
  if (!token) {
    return null;
  }
  return jwt.decode(token, { json: true }) as JSONWebToken;
};

export const isEligibleToAccess = (
  token: JSONWebToken | null,
  eligibleRoles: PunterRoles = [],
): boolean => {
  if (token) {
    if (!isEmpty(eligibleRoles)) {
      const { realm_access = {} } = token;
      const { roles = [] } = realm_access;
      return eligibleRoles.filter((role) => roles.includes(role)).length > 0;
    }
    return true;
  }
  return false;
};

export const validateAndCheckEligibility = (
  token: string,
  eligibleRoles: PunterRoles = [],
): boolean => isEligibleToAccess(validateAndDecode(token), eligibleRoles);

export const buildRedirectUrl = (pathname: string) =>
  pathname.includes(ROUTE_AUTH) ? "" : `${ROUTE_AUTH}?redirectTo=${pathname}`;
