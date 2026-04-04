import axios from "axios";
import { schedule } from "node-cron";
import { RequestHandler } from "express";
import { Locales } from "../types";
import API from "../serverApi";

let locales: Locales | undefined;

async function updateLocales() {
  const response = await axios.get<Locales>(
    `${process.env.API}api/localizations`
  );
  locales = response.data;
}

schedule("*/5 * * * *", updateLocales);

export const getLocales =
  (defaultLocale: string): RequestHandler =>
  async (req, res, next) => {
    const api = API.create({
      req,
      res,
      locale: defaultLocale
    });

    if (!locales) {
      locales = await api.locales.getLocales();
    }

    req.locales = locales;
    next();
  };
