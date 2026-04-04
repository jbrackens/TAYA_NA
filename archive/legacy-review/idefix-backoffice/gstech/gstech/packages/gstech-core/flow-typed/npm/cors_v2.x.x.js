// flow-typed signature: 425712a647645fb8847dbd9109337837
// flow-typed version: c6154227d1/cors_v2.x.x/flow_>=v0.104.x

// @flow
declare module "cors" {
  import type { $Request as Request, $Response as Response, NextFunction } from "express";

  declare type RequestHandler = {
      (req: Request, res: Response, next?: NextFunction): mixed;
  };

  declare type CustomOrigin = (
      requestOrigin: string,
      callback: (err: Error | null, allow?: boolean) => void
  ) => void;

  declare type CorsOptions = {
      origin?: boolean | string | RegExp | string[] | RegExp[] | CustomOrigin,
      methods?: string | string[],
      allowedHeaders?: string | string[],
      exposedHeaders?: string | string[],
      credentials?: boolean,
      maxAge?: number,
      preflightContinue?: boolean,
      optionsSuccessStatus?: number,
      ...
  }
  declare module.exports: (options?: CorsOptions) => RequestHandler;
}
