import useFetch, { CachePolicies } from "use-http";
import { useState, useEffect, useRef } from "react";
import { useToken } from "../token-store/token-store-service";
import { useDispatch } from "react-redux";
import { get as getProps, isEqual, isEmpty, startCase, isNil } from "lodash";
import qs from "qs";
import { transformError } from "../../errors";
import { appendSecondsToTimestamp } from "../../converters";
import dayjs from "dayjs";

export type UseApiHook<
  TData = any,
  TError = any,
  TBody = any,
> = {
  triggerApi: (
    body?: TBody,
    params?: RequestParams,
    headers?: RequestHeaders,
  ) => void;
  isLoading: boolean;
  data: TData;
  error: TError;
  statusOk?: boolean;
  triggerRefresh: (force?: boolean) => void;
  resetHookState: () => void;
};

export type RequestQuery = {
  [key: string]: any;
};

export type RequestParams = {
  [key: string]: any;
  query?: RequestQuery;
};

export type RequestHeaders = {
  [key: string]: string | undefined;
};

export enum Method {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

export enum CallType {
  CORS = "cors",
}

export type FetchArgs = {
  headers: RequestHeaders;
  method: Method;
  body?: string | Object;
};

export const sanitizeHeaders = (headers: RequestHeaders): RequestHeaders =>
  Object.keys(headers)
    .filter((key: string) => !isNil(headers[key]))
    .reduce(
      (prev: RequestHeaders, curr: string) => ({
        ...prev,
        [startCase(startCase(curr).toLowerCase())
          .split(" ")
          .join("-")]: headers[curr],
      }),
      {},
    );

export const generateFetchArgs = (
  method: Method,
  headers: RequestHeaders | undefined,
  body: Object,
  accessToken: string | null,
  url: string = "",
): FetchArgs => {
  const baseHeaders = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Authorization:
      url.includes(AUTH_URL) || !accessToken
        ? undefined
        : `Bearer ${accessToken || ""}`,
    ...headers,
  };
  const baseArgs = {
    headers: {
      ...sanitizeHeaders(baseHeaders),
    },
    method,
  };
  const methodsWithBody = [Method.POST, Method.PUT, Method.PATCH];
  if (methodsWithBody.includes(method)) {
    return {
      ...baseArgs,
      body,
    };
  }
  return baseArgs;
};

type RefreshData =
  | {
      hasToAcceptTerms: string;
      token: {
        refreshToken: string;
        token: string;
        expiresIn: number;
        refreshExpiresIn: number;
      };
    }
  | undefined;

type ApiHookState = {
  isReadyToTrigger: boolean;
  isReadyToTriggerRefresh: boolean;
  isReadyToReturn: boolean;
  requestBody?: any;
  requestParams?: Object;
  requestHeaders?: RequestHeaders;
  responseData?: any;
  forceRefresh: boolean;
  resetState: boolean;
};

const initState = {
  isReadyToTrigger: false,
  isReadyToTriggerRefresh: false,
  isReadyToReturn: false,
  forceRefresh: false,
  resetState: false,
} as ApiHookState;

const AUTH_URL = "login";
const REFRESH_URL = "token/refresh";
const tokenToRefreshError = "invalidAuthToken";

export const useApiHook = (
  url: string,
  method: Method,
  apiEndpoint: string,
  onSucceed?: Function,
  logOut?: Function,
): UseApiHook => {
  return useApiHookTyped(url, method, apiEndpoint, onSucceed, logOut);
};

export const useApiHookTyped = <
  TData = any,
  TError = any,
  TBody = any,
>(
  url: string,
  method: Method,
  apiEndpoint: string,
  onSucceed?: Function,
  logOut?: Function,
): UseApiHook<TData, TError, TBody> => {
  if (typeof window === "undefined") {
    return {} as UseApiHook<TData, TError, TBody>;
  }
  const dispatch = useDispatch();
  const stateRef = useRef<ApiHookState>(initState);
  const [state, setState] = useState<ApiHookState>(initState);
  const setStateRef = (stateProps: ApiHookState) => {
    stateRef.current = {
      ...stateProps,
    };
    setState(stateProps);
  };
  const {
    isReadyToTrigger,
    isReadyToTriggerRefresh,
    isReadyToReturn,
    requestBody,
    requestParams,
    requestHeaders,
    responseData,
    resetState,
  } = stateRef.current;

  const {
    getToken,
    getRefreshToken,
    saveToken,
    clearRefreshToken,
    clearToken,
    saveTokenExpDate,
    clearRefreshTokenExpDate,
    clearTokenExpDate,
    getRefreshTokenExpDate,
    getTokenExpDate,
    clearUserId,
  } = useToken();

  /**
   * Purge tokens and state
   */
  const logOutAndClearTokens = () => {
    // Clear tokens in service
    clearRefreshToken();
    clearToken();
    clearRefreshTokenExpDate();
    clearTokenExpDate();
    clearUserId();

    // Clear execution flags
    setStateRef({
      ...stateRef.current,
      isReadyToTrigger: false,
      isReadyToTriggerRefresh: false,
    });
    if (logOut) {
      dispatch(logOut());
    }
  };

  /**
   * Trigger API function exposed to the FC
   */
  const triggerApi = (
    body: TBody = {} as TBody,
    params: RequestParams = {},
    headers: RequestHeaders = {},
  ): void => {
    setStateRef({
      ...stateRef.current,
      requestBody: body,
      requestParams: params,
      requestHeaders: headers,
      isReadyToTrigger: true,
      isReadyToReturn: true,
    });
  };

  /**
   * Resolve query and props and build final url
   */
  const resolveUrl = (url: string, params: RequestParams = {}) => {
    let query = "";
    if (params.query) {
      query = qs.stringify(params.query, {
        allowDots: true,
        skipNulls: true,
        indices: false,
      });
    }
    const parametrizedUrl = Object.keys(params)
      .filter((key) => key !== "query")
      .reduce(
        (prev, curr) => prev.replace(`:${curr}`, getProps(params, curr)),
        url,
      );
    return `${parametrizedUrl}${query ? `?${query}` : ""}`;
  };

  /**
   * Call relevant HTTP method
   */
  const callMethod = async (args: FetchArgs, props: any) => {
    const { method, ...restArgs } = args;
    const castedMethod = method.toLowerCase();
    switch (method) {
      case Method.DELETE:
        return props.del();
      case Method.POST:
      case Method.PUT:
        return props[castedMethod](
          "",
          restArgs.body ? restArgs.body : undefined,
        );
      default:
        return props[castedMethod]();
    }
  };

  //
  // API call
  //

  const resolvedUrl = resolveUrl(`${apiEndpoint}/${url}`, requestParams);
  const fetchArgs = generateFetchArgs(
    method,
    requestHeaders,
    requestBody,
    getToken(),
    resolvedUrl,
  );

  const callInterceptor = async ({ options }: { options: RequestInit }) => {
    const { requestHeaders, requestBody } = stateRef.current;
    const { headers } = generateFetchArgs(
      method,
      requestHeaders,
      requestBody,
      getToken(),
      resolvedUrl,
    );
    return {
      ...options,
      headers: {
        ...options.headers,
        ...headers,
      },
    };
  };

  const { response, request, loading, ...rest } = useFetch(
    `${resolvedUrl}`,
    (globalOptions) => ({
      ...globalOptions,
      cachePolicy: CachePolicies.NO_CACHE,
      interceptors: {
        request: callInterceptor,
      },
    }),
  );

  const callError = response?.ok === false;
  const callSucceeded = response?.ok === true;

  //
  // Refresh token API call
  //

  const refreshCallInterceptor = async ({
    options,
  }: {
    options: RequestInit;
  }) => {
    return {
      ...options,
      headers: {
        ...options.headers,
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
    };
  };

  const refreshCall = useFetch(
    `${apiEndpoint}/${REFRESH_URL}`,
    (globalOptions) => ({
      ...globalOptions,
      cachePolicy: CachePolicies.NO_CACHE,
      interceptors: {
        request: refreshCallInterceptor,
      },
    }),
  );

  const refreshCallError = refreshCall?.response?.ok === false;
  const refreshData = refreshCall?.response?.data as RefreshData;
  const isAuthorizationRequired =
    callError && response?.status === 401 && url !== AUTH_URL;

  const isRefreshTokenUpToDate = (value = getRefreshTokenExpDate()) =>
    Date.now() < (value ? value : 0);

  const triggerRefresh = (force = false) => {
    setStateRef({
      ...stateRef.current,
      isReadyToTriggerRefresh: true,
      forceRefresh: force ? true : false,
    });
  };

  const resetHookState = () => {
    setStateRef({
      ...stateRef.current,
      resetState: true,
    });
  };

  /**
   * ## Handle effect ##
   *
   * Verify if authorization is required
   */
  useEffect(() => {
    if (isAuthorizationRequired) {
      if (isRefreshTokenUpToDate(getRefreshTokenExpDate())) {
        triggerRefresh();
      } else {
        if (
          response?.data?.errors.some(
            (error: { errorCode: string }) =>
              error.errorCode === tokenToRefreshError,
          )
        ) {
          logOutAndClearTokens();
        }
      }
    }
  }, [isAuthorizationRequired]);

  /**
   * ## Handle effect ##
   *
   * Trigger a call
   */
  useEffect(() => {
    if (isReadyToTrigger) {
      const trigger = async () => {
        await callMethod(fetchArgs, rest);
        setStateRef({
          ...stateRef.current,
          isReadyToTrigger: false,
        });
      };
      trigger();
    }
  }, [isReadyToTrigger]);

  /**
   * ## Handle effect ##
   *
   * Trigger a refresh token call
   */
  useEffect(() => {
    if (isReadyToTriggerRefresh) {
      const trigger = async () => {
        await refreshCall.post({
          refresh_token: getRefreshToken() || "",
        });
        setStateRef({
          ...stateRef.current,
          isReadyToTrigger: stateRef.current.forceRefresh ? false : true,
          isReadyToTriggerRefresh: false,
        });
      };
      trigger();
    }
  }, [isReadyToTriggerRefresh]);

  /**
   * ## Handle effect ##
   *
   * Check refresh call response
   */
  useEffect(() => {
    if (
      !refreshCallError &&
      refreshData?.token.token &&
      refreshData.token.refreshToken &&
      refreshData.token.expiresIn &&
      refreshData.token.refreshExpiresIn
    ) {
      const now = dayjs().valueOf();
      saveToken(refreshData.token.token, refreshData.token.refreshToken);
      saveTokenExpDate(
        appendSecondsToTimestamp(refreshData.token.expiresIn, now),
        appendSecondsToTimestamp(refreshData.token.refreshExpiresIn, now),
      );
      setStateRef({
        ...stateRef.current,
        isReadyToTrigger: stateRef.current.forceRefresh ? false : true,
        forceRefresh: false,
      });
    } else if (refreshCallError) {
      logOutAndClearTokens();
    }
  }, [refreshData, refreshCallError]);

  /**
   * ## Handle effect ##
   *
   * Complete execution of core call ended with dispatching of Redux action if available
   */
  useEffect(() => {
    const completeExecution = () => {
      const shouldSucceed =
        callSucceeded &&
        !loading &&
        !isEmpty(response?.data) &&
        !isEqual(responseData, response?.data);
      if (shouldSucceed && isReadyToReturn && onSucceed) {
        dispatch(onSucceed(response.data));
        setStateRef({
          ...stateRef.current,
          responseData: response.data,
          isReadyToReturn: false,
        });
      }
    };
    completeExecution();
  });

  useEffect(() => {
    if (resetState) {
      setStateRef({
        ...stateRef.current,
        resetState: false,
      });
    }
  }, [response.data]);

  const getDataToReturn = (
    isLoading: boolean,
    apiResponse: any,
    hasError: boolean,
  ): {
    error: TError;
    data: TData;
    isLoading: boolean;
    statusOk?: boolean;
  } => {
    const transformedError = transformError(apiResponse);
    const hasInvalidAuthTokenError = transformedError.payload?.errors?.some(
      (error: any) => error.errorCode === tokenToRefreshError,
    );

    if (hasInvalidAuthTokenError) {
      return {
        error: undefined as unknown as TError,
        data: undefined as unknown as TData,
        isLoading: false,
        statusOk: undefined,
      };
    }

    if (isAuthorizationRequired && !hasInvalidAuthTokenError) {
      return {
        error: transformedError as unknown as TError,
        data: undefined as unknown as TData,
        isLoading,
        statusOk: false,
      };
    } else if (!isLoading) {
      return {
        error: hasError
          ? (transformedError as unknown as TError)
          : (undefined as unknown as TError),
        data: hasError
          ? (undefined as unknown as TData)
          : (apiResponse.data as TData),
        isLoading,
        statusOk: callSucceeded,
      };
    } else {
      return {
        data: undefined as unknown as TData,
        error: undefined as unknown as TError,
        isLoading,
      };
    }
  };

  return {
    triggerApi,
    ...getDataToReturn(loading, response, callError),
    triggerRefresh,
    resetHookState,
  };
};
