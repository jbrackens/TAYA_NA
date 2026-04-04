import { RequestHandler } from "express";
import { Profile } from "../types";
import API from "../serverApi";

export const getProfile =
  (defaultLocale: string, defaultCurrency: string): RequestHandler =>
  async (req, res, next) => {
    const api = API.create({
      req,
      res,
      locale: defaultLocale
    });

    let profile = {
      FirstName: "",
      LanguageISO: defaultLocale,
      CurrencyISO: defaultCurrency
    };

    try {
      const actualProfile = await api.profile.getProfile();

      if (actualProfile) {
        profile = actualProfile;
      }
    } catch (err) {
      console.error("Failed to get user's profile.", err.toString());
    }

    req.profile = <Profile>profile;
    next();
  };
