import { RequestHandler } from "express";
import API from "../serverApi";
import { Config } from "../types";

export const getConfig = (
  defaultLocale: string,
  supportedLanguages: string
): RequestHandler => {
  let config: Config;

  return async (req, res, next) => {
    if (!config) {
      const locale =
        req.params.lang && supportedLanguages.includes(req.params.lang)
          ? req.params.lang
          : defaultLocale;
      try {
        const api = API.create({
          req,
          res,
          locale,
          onError: (...args) => console.log("error", ...args)
        });

        config = await api.config.getConfig();
      } catch (err) {
        console.log("Failed to get config", err.toString());
        process.exit(err.toString());
      }
    }

    req.config = config;
    next();
  };
};
