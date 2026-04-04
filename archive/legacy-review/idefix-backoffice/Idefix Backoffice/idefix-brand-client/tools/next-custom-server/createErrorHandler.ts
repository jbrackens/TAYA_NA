import { AxiosError } from "axios";
import { Response } from "express";
import ApiError from "./ApiError";

const UNAUTHORIZED = 401;

const createErrorHandler =
  (res: Response, locale: string, onError?: (error: ApiError) => unknown) =>
  (err: AxiosError) => {
    if (err.response) {
      const errorResponseUrl =
        (err && err.response && err.response.config.url) || "";

      if (err.response.status === UNAUTHORIZED) {
        res.writeHead(303, { Location: `/${locale}/login/again/` });
        return res.end();
      }

      //no need to handle errors from urls /api/refresh-game/ and /api/statistics

      if (
        errorResponseUrl.includes("/api/refresh-game/") ||
        errorResponseUrl.includes("/api/statistics")
      ) {
        return;
      }

      if (err.response && err.response.status && onError) {
        onError(new ApiError(undefined, err.response.status));
      }
    }
    return Promise.reject(err);
  };

export default createErrorHandler;
