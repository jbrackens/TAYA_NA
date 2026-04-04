import { useApiHook, Method } from "utils";
import { logOut } from "../../lib/slices/authSlice";
const { API_GLOBAL_ENDPOINT } =
  require("next/config").default().publicRuntimeConfig;

export const useApi = (
  url: string,
  method: string,
  baseUrl: string = API_GLOBAL_ENDPOINT,
) => useApiHook(url, method as Method, baseUrl, logOut);
