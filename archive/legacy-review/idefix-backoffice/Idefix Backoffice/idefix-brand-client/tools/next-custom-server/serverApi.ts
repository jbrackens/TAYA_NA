import axios from "axios";
import ApiError from "./ApiError";
import createErrorHandler from "./createErrorHandler";
import getHeaders from "./getHeaders";
import { Config, Profile, Locales } from "./types";

interface Options {
  req: any;
  res: any;
  locale: string;
  onError?: (error: ApiError) => unknown;
}

interface ServerApi {
  locales: {
    getLocales: () => Promise<Locales>;
  };
  profile: {
    getProfile: () => Promise<Profile>;
  };
  config: {
    getConfig: () => Promise<Config>;
  };
}

const createAPI = ({ req, res, locale, onError }: Options) => {
  const api = axios.create({
    baseURL: process.env.API,
    headers: {
      ...getHeaders(req)
    },
    withCredentials: true
  });

  api.interceptors.response.use(response => {
    if (response.headers["set-cookie"]) {
      res.setHeader("Set-Cookie", response.headers["set-cookie"]);
    }

    const data = response.data as any;

    if (data.ok === false && data.result != null && onError) {
      onError(new ApiError(data.result));
    }

    return data;
  }, createErrorHandler(res, locale, onError));

  return api;
};

export default {
  create: ({ req, res, locale, onError }: Options) => {
    let api = createAPI({ req, res, locale, onError });

    return {
      config: {
        getConfig: () => api.get("/api/config")
      },
      profile: {
        getProfile: () =>
          api
            .get<{ profile: Profile }>("/api/profile")
            // @ts-ignore TODO: fix axios types here and in @core/api
            .then(data => data.profile)
      },
      locales: {
        getLocales: () => api.get("/api/localizations")
      }
    } as ServerApi;
  }
};
