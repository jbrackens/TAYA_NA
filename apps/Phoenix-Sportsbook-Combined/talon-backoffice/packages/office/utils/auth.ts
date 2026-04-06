const {
  API_GLOBAL_ENDPOINT,
} = require("next/config").default().publicRuntimeConfig;
import Router from "next/router";
import { NextPageContext } from "next";
import { appendSecondsToTimestamp } from "@phoenix-ui/utils/dist/converters";
import { Method } from "@phoenix-ui/utils/dist/services/api/api-service";
import { useToken } from "@phoenix-ui/utils/dist/services/token-store/token-store-service";
import type {
  PunterRoles,
  JSONWebToken,
} from "@phoenix-ui/utils/dist/types/punter";
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
      return normalizeRefreshPayload(await refreshResponse.json());
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
      const extended = await extendAuthSession(refreshToken);
      if (extended) return extended;
      // If refresh fails but token exists, keep session alive (dev mode)
      return token;
    } catch (e) {
      // In dev mode, don't redirect if we have a token
      if (process.env.NODE_ENV !== "development") {
        Router.push(buildRedirectUrl(currentPath));
      }
      return token;
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
  if (!refreshData) {
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
      const roles = extractRoles(token);
      return (
        eligibleRoles.filter((role) => roles.includes(normalizeRole(role)))
          .length > 0
      );
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

type NormalizedRefreshPayload = {
  token: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
};

const normalizeRefreshPayload = (
  payload: any,
): NormalizedRefreshPayload | null => {
  if (
    payload?.token?.token &&
    payload?.token?.refreshToken &&
    payload?.token?.expiresIn &&
    payload?.token?.refreshExpiresIn
  ) {
    return {
      token: payload.token.token,
      refreshToken: payload.token.refreshToken,
      expiresIn: payload.token.expiresIn,
      refreshExpiresIn: payload.token.refreshExpiresIn,
    };
  }

  const accessToken = payload?.access_token || payload?.token;
  const refreshToken = payload?.refresh_token || payload?.refreshToken;
  const expiresIn = payload?.expires_in || payload?.expiresIn;
  const refreshExpiresIn =
    payload?.refresh_expires_in || payload?.refreshExpiresIn;

  if (accessToken && refreshToken && expiresIn && refreshExpiresIn) {
    return {
      token: accessToken,
      refreshToken,
      expiresIn,
      refreshExpiresIn,
    };
  }

  return null;
};

const extractRoles = (token: JSONWebToken): string[] => {
  const { realm_access = {} } = token;
  const realmRoles = Array.isArray(realm_access?.roles)
    ? realm_access.roles.map((role: string) => normalizeRole(role))
    : [];
  const directRole =
    typeof token.role === "string" ? [normalizeRole(token.role)] : [];
  return Array.from(new Set([...realmRoles, ...directRole])).filter(Boolean);
};

const normalizeRole = (role: string): string =>
  role.trim().toLowerCase().replace(/_/g, "-");
