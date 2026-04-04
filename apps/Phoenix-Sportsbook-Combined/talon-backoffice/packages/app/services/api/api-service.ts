const {
  API_GLOBAL_ENDPOINT,
} = require("next/config").default().publicRuntimeConfig;
import { logOut, onSucceededLogin } from "../../lib/slices/authSlice";
import { useApiHookTyped, Method, UseApiHook } from "@phoenix-ui/utils";

export type UseApi<TData = any, TError = any, TBody = any> =
  UseApiHook<TData, TError, TBody>;

export const useApi = <TData = any, TError = any, TBody = any>(
  url: string,
  method: string,
  baseUrl?: string,
): UseApi<TData, TError, TBody> =>
  useApiHookTyped<TData, TError, TBody>(
    url,
    method as Method,
    baseUrl ? baseUrl : API_GLOBAL_ENDPOINT,
    onSucceededLogin,
    logOut,
  );
