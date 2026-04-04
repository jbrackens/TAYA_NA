const {
  API_GLOBAL_ENDPOINT,
} = require("next/config").default().publicRuntimeConfig;
import { shouldLogoutUser } from "../../lib/slices/authSlice";
import { useApiHook, Method, useSpy } from "@phoenix-ui/utils";

export type ApiResponse = {
  succeeded?: boolean;
  error?: any;
  data?: any;
};

export type UseApi = [Function, boolean, ApiResponse, Function, Function];

export const useApi = (
  url: string,
  method: Method,
  onSucceeded?: Function,
): UseApi => {
  const { spy } = useSpy();
  const {
    triggerApi,
    isLoading,
    data,
    error,
    statusOk,
    triggerRefresh,
    resetHookState,
  } = useApiHook(
    url,
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
