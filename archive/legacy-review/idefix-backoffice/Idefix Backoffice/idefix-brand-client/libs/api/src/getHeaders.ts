import { NextApiRequest } from "next";
import isUndefined from "lodash/isUndefined";
import omitBy from "lodash/omitBy";
import zipObject from "lodash/zipObject";

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

export default function getHeaders(req: NextApiRequest) {
  return omitBy(
    zipObject(
      headerKeys,
      headerKeys.map(key => req && req.headers[key])
    ),
    isUndefined
  );
}
