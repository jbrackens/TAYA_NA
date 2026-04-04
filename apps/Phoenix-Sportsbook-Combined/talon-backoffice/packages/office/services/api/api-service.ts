const {
  API_GLOBAL_ENDPOINT,
} = require("next/config").default().publicRuntimeConfig;
import { shouldLogoutUser } from "../../lib/slices/authSlice";
import { useApiHookTyped, Method, useSpy, UseApiHook } from "@phoenix-ui/utils";

const OFFICE_GO_ROUTE_ALIASES: Record<string, string> = {
  login: "auth/login",
  logout: "auth/logout",
  "admin/punters/:id/recent-activities": "admin/punters/:id/timeline",
};

export type ApiResponse<TData = any, TError = any> = {
  succeeded?: boolean;
  error?: TError;
  data?: TData;
};

export type UseApi<TData = any, TError = any, TBody = any> = [
  UseApiHook<TData, TError, TBody>["triggerApi"],
  boolean,
  ApiResponse<TData, TError>,
  UseApiHook<TData, TError, TBody>["triggerRefresh"],
  UseApiHook<TData, TError, TBody>["resetHookState"],
];

export const useApi = <TData = any, TError = any, TBody = any>(
  url: string,
  method: Method,
  onSucceeded?: Function,
): UseApi<TData, TError, TBody> => {
  const { spy } = useSpy();
  const {
    triggerApi,
    isLoading,
    data,
    error,
    statusOk,
    triggerRefresh,
    resetHookState,
  } = useApiHookTyped<TData, TError, TBody>(
    normalizeOfficeApiPath(url),
    method,
    API_GLOBAL_ENDPOINT,
    onSucceeded,
    shouldLogoutUser,
  );

  let response: ApiResponse = {};
  if (error) {
    response = {
      succeeded: false,
      error,
    };
  } else if (statusOk) {
    response = {
      succeeded: true,
      data,
    };
  }

  spy(isLoading, () => {
    if (!isLoading && error) {
      window.dispatchEvent(
        new CustomEvent("alert", {
          detail: error,
        }),
      );
    }
  });

  return [triggerApi, isLoading, response, triggerRefresh, resetHookState];
};

export const normalizeOfficeApiPath = (url: string): string => {
  const normalizedKey = url.replace(/^\/+/, "");
  return OFFICE_GO_ROUTE_ALIASES[normalizedKey] || url;
};
