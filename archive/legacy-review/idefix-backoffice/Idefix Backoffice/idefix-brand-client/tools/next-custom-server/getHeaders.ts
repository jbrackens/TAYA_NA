import { Request } from "express";
const isUndefined = require("lodash/isUndefined");
const omitBy = require("lodash/omitBy");
const zipObject = require("lodash/zipObject");

const headerKeys = [
  "cookie",
  "accept-language",
  "user-agent",
  "cf-ipcountry",
  "cf-connecting-ipv6",
  "cf-connecting-ip",
  "x-client-ip",
  "x-forwarded-for"
];

export default function getHeaders(req: Request) {
  return omitBy(
    zipObject(
      headerKeys,
      headerKeys.map(key => req && req.headers[key])
    ),
    isUndefined
  );
}
