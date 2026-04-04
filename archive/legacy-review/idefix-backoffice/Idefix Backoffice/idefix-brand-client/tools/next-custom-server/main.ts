import { NextServer } from "next/dist/server/next";
import { NextServerOptions } from "@nrwl/next";
import { getApiRoutes } from "./apiRoutes";

const express = require("express");

const PORT = Number(process.env.PORT);

export default async function nextWatchServer(
  nextServer: NextServer,
  settings: NextServerOptions & { [prop: string]: any }
) {
  await nextServer.prepare();

  const server = express();
  server.disable("x-powered-by");

  getApiRoutes({
    server,
    nextServer,
    settings
  });

  server.listen(PORT || settings.port, settings.hostname);
}
