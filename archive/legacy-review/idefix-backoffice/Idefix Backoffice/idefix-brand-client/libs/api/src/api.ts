import { executeClientCallbacks, isServer } from "@brandserver-client/utils";
import axios, { AxiosRequestHeaders } from "axios";
import ApiError from "./ApiError";
import createErrorHandler from "./createErrorHandler";
import getHeaders from "./getHeaders";
import methods from "./methods";

interface Options {
  req: any;
  res: any;
  locale: string;
  onError?: (error: ApiError) => unknown;
  onReceiveUpdate?: any;
}

const createAPI = ({ req, res, locale, onReceiveUpdate, onError }: Options) => {
  const api = axios.create({
    baseURL: isServer ? process.env.API : undefined,
    headers: {
      ...(getHeaders(req) as AxiosRequestHeaders)
    },
    withCredentials: true
  });

  api.interceptors.response.use(response => {
    if (response.headers["set-cookie"]) {
      res.setHeader("Set-Cookie", response.headers["set-cookie"]);
    }

    const data = response.data as any;
    if (data.update) {
      if (isServer) {
        const { executes, callbacks, scripts, ...rest } = data.update;
        onReceiveUpdate({
          serverExecutes: executes ? executes : undefined,
          serverCallbacks: callbacks ? callbacks : undefined,
          serverScripts: scripts ? scripts : undefined,
          ...rest
        });
      }

      if (!isServer) {
        onReceiveUpdate(data.update);
        executeClientCallbacks(data.update);
      }
    }

    if (
      response.config &&
      response.config.url &&
      (response.config.url.includes("/api/register/complete") ||
        response.config.url.includes("/api/password") ||
        response.config.url.includes("/api/questionnaire/"))
    ) {
      return response.data;
    }

    // TODO: check out this approach. is it good show all loggedin error in dialog?
    if (data.ok === false && data.result != null && onError) {
      onError(new ApiError(data.result));
    }

    return data;
  }, createErrorHandler(res, locale, onError));

  return api;
};

export { getHeaders, createErrorHandler };

export default {
  create: ({ req, res, locale, onReceiveUpdate, onError }: Options) => {
    const api = createAPI({ req, res, locale, onReceiveUpdate, onError });

    return methods(api);
  }
};
