// flow-typed signature: 09c78e8e0a764f42b27e28c07db3604f
// flow-typed version: c6154227d1/body-parser_v1.x.x/flow_>=v0.104.x

declare module "body-parser" {
  import type { Middleware, $Request, $Response } from "express";

  declare type bodyParser$Options = {
    inflate?: boolean,
    limit?: number | string,
    type?: string | string[] | ((req: $Request) => any),
    verify?: (
      req: $Request,
      res: $Response,
      buf: Buffer,
      encoding: string
    ) => void,
    ...
  };

  declare type bodyParser$OptionsText = bodyParser$Options & {
    reviver?: (key: string, value: any) => any,
    strict?: boolean,
    ...
  };

  declare type bodyParser$OptionsJson = bodyParser$Options & {
    reviver?: (key: string, value: any) => any,
    strict?: boolean,
    ...
  };

  declare type bodyParser$OptionsXML = bodyParser$Options & {
    reviver?: (key: string, value: any) => any,
    strict?: boolean,
    ...
  };

  declare type bodyParser$OptionsUrlencoded = bodyParser$Options & {
    extended?: boolean,
    parameterLimit?: number,
    ...
  };

  declare type Options = bodyParser$Options;
  declare type OptionsText = bodyParser$OptionsText;
  declare type OptionsJson = bodyParser$OptionsJson;
  declare type OptionsXML = bodyParser$OptionsText;
  declare type OptionsUrlencoded = bodyParser$OptionsUrlencoded;

  declare function json(options?: OptionsJson): Middleware<any,any>;

  declare function raw(options?: Options): Middleware<any,any>;

  declare function text(options?: OptionsText): Middleware<any,any>;

  declare function xml(options?: OptionsXML): Middleware<any,any>;

  declare function urlencoded(options?: OptionsUrlencoded): Middleware<any,any>;
}
