import { Express } from "express";
import { getConfig } from "./middlewares/getConfig";
import { getLocales } from "./middlewares/getLocales";
import { getProfile } from "./middlewares/getProfile";
import { checkHeadersSent } from "./middlewares/checkHeadersSent";
import { getLocaleData } from "./middlewares/getLocaleData";
import { NextServer } from "next/dist/server/next";
import { createProxyMiddleware } from "http-proxy-middleware";
import { NextServerOptions } from "@nrwl/next";

const morgan = require("morgan");
const compression = require("compression");
const path = require("path");
const express = require("express");

interface Params {
  server: Express;
  nextServer: NextServer;
  settings: NextServerOptions & { [prop: string]: any };
}

export function getApiRoutes({ server, nextServer, settings }: Params) {
  const supportedLanguages = process.env.SUPPORTED_LANGUAGES;
  const defaultLocale = process.env.DEFAULT_LOCALE;
  const defaultCurrency = process.env.DEFAULT_CURRENCY;
  const proxyURL = process.env.API;

  const handle = nextServer.getRequestHandler();

  const apiProxy = createProxyMiddleware({
    target: proxyURL,
    changeOrigin: true,
    onProxyReq(proxyReq) {
      proxyReq.setHeader("X-API", "true");
    }
  });

  const wsProxy = createProxyMiddleware("/ws", {
    target: proxyURL,
    ws: true,
    changeOrigin: true
  });

  if (process.env.NODE_ENV === "production") {
    server.use(morgan("combined"));
    server.use(compression());
  }

  server.get("/api/v1/status", (_, res) => res.json({ ok: true }));
  server.use(wsProxy);
  server.use("/api", apiProxy);
  server.use("/logout", apiProxy);
  server.get(`/:lang(${supportedLanguages})/content/*`, apiProxy);

  // set manually to express static folder public folder of every brand
  server.use(express.static(path.resolve(settings.dir, "public")));
  server.use(
    "/_next",
    express.static(path.resolve(settings.dir, settings.conf.outdir, ".next"))
  );

  server.use(getConfig(defaultLocale, supportedLanguages));

  server.use(getLocales(defaultLocale));

  server.use("/loggedin", getProfile(defaultLocale, defaultCurrency));
  server.use("/loggedin", checkHeadersSent);

  server.use(
    `/:lang(${supportedLanguages})*`,
    getLocaleData(defaultLocale, defaultCurrency, supportedLanguages)
  );

  server.use(
    "/loggedin",
    getLocaleData(defaultLocale, defaultCurrency, supportedLanguages)
  );

  server.get(`/:lang(${supportedLanguages})/forgot`, (req, res) => {
    const actualPage = "/";
    const queryParams = {
      lang: req.params.lang,
      forgot: "true"
    };

    nextServer.render(req, res, actualPage, queryParams);
  });

  server.get(`/:lang(${supportedLanguages})/unsubscribe`, (req, res) => {
    const actualPage = "/";
    const queryParams = {
      lang: req.params.lang as string,
      loginAgain: "true",
      unsubscribe: "true",
      email: req.query.email as string
    };

    nextServer.render(req, res, actualPage, queryParams);
  });

  server.get(`/:lang(${supportedLanguages})/login`, (req, res) => {
    const actualPage = "/";
    const queryParams = {
      lang: req.params.lang,
      login: "true"
    };

    nextServer.render(req, res, actualPage, queryParams);
  });

  server.get(`/:lang(${supportedLanguages})/login/again`, (req, res) => {
    const actualPage = "/";
    const queryParams = {
      lang: req.params.lang,
      loginAgain: "true"
    };

    nextServer.render(req, res, actualPage, queryParams);
  });

  server.get(`/:lang(${supportedLanguages})/subscriptions`, (req, res) => {
    const actualPage = "/subscriptions";

    const queryParams = {
      lang: req.params.lang as string,
      token: req.query.token as string
    };

    nextServer.render(req, res, actualPage, queryParams);
  });

  server.get(`/:lang(${supportedLanguages})/games/all`, (req, res) => {
    const actualPage = "/games";
    const queryParams = {
      lang: req.params.lang,
      freeGames: "true"
    };

    nextServer.render(req, res, actualPage, queryParams);
  });

  server.get(`/:lang(${supportedLanguages})/game/:game`, (req, res) => {
    const actualPage = "/game";
    const queryParams = {
      launchFreeGame: "true",
      lang: req.params.lang,
      game: req.params.game
    };

    nextServer.render(req, res, actualPage, queryParams);
  });

  server.get(`/:lang(${supportedLanguages})/*`, (req, res) => {
    const actualPage = "/";

    const queryParams = {
      lang: req.params.lang
    };

    nextServer.render(req, res, actualPage, queryParams);
  });

  server.get(`/:lang(${supportedLanguages})?`, (req, res) => {
    const actualPage = "/";

    const queryParams = {
      lang: req.params.lang
    };

    nextServer.render(req, res, actualPage, queryParams);
  });

  // TODO: instead of two last routes better to use server.all("*", (req, res) => nextRequestHandler(req, res));

  server.get("/loggedin*", (req, res) => {
    handle(req, res);
  });

  server.get("/sitemap.xml", (req, res) => {
    nextServer.render(req, res, "/sitemap.xml");
  });

  server.get("*", (req, res) => {
    const actualPage = "/";

    nextServer.render(req, res, actualPage, {});
  });
}
