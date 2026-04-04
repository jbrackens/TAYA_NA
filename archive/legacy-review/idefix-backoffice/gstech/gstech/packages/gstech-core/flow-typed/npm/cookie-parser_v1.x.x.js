// flow-typed signature: 99be6078a6164f8788a6386b67e56f1a
// flow-typed version: 2f514ea8dd/cookie-parser_v1.x.x/flow_>=v0.104.x

/**
 * Flow libdef for 'cookie-parser'
 * See https://www.npmjs.com/package/cookie-parser
 * by Vincent Driessen, 2018-12-21
 */


declare module 'cookie-parser' {
  declare type Middleware = express$Middleware<express$Request, express$Response>;

  declare function cookieParser(
    secret?: string | Array<string>,
    options?: mixed
  ): Middleware;

  declare module.exports: typeof cookieParser;
}
