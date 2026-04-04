// flow-typed signature: b51614d88786a7427c10ffd90ea57439
// flow-typed version: c6154227d1/type-is_v1.x.x/flow_>=v0.104.x

// @flow

declare module 'type-is' {
  declare module.exports: {
    // typeofrequest
    (req: mixed, types?: Array<string>): string|boolean|null,
    is: (value: string, types: Array<string>) => string|boolean,
    hasBody: (request: mixed) => boolean,
    normalize: (type: string) => false|string,
    match: (expected: string, actual: string) => boolean,
    ...
  }
}
