const {
  API_GLOBAL_ENDPOINT,
} = require("next/config").default().publicRuntimeConfig;
import { logOut, onSucceededLogin } from "../../lib/slices/authSlice";
import { useApiHook, Method } from "@phoenix-ui/utils";

export const useApi = (url: string, method: string, baseUrl?: string) =>
  useApiHook(
    url,
    method as Method,
    baseUrl ? baseUrl : API_GLOBAL_ENDPOINT,
    onSucceededLogin,
    logOut,
  );
