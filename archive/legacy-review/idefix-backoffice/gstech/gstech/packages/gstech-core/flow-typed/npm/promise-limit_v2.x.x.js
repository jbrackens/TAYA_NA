// flow-typed signature: e8f5f64bc2ac5fb5be3857b59bea0458
// flow-typed version: c6154227d1/promise-limit_v2.x.x/flow_>=v0.104.x

/**
 * Flow libdef for 'promise-limit'
 * See https://www.npmjs.com/package/promise-limit
 * by Vincent Driessen, 2019-01-04
 */

declare module 'promise-limit' {
  declare type limit<T> = limitFunc<T> & limitInterface<T>;
  declare type limitFunc<T> = (fn: () => Promise<T>) => Promise<T>;
  declare interface limitInterface<T> {
    map<U>(
      items: $ReadOnlyArray<T>,
      mapper: (value: T) => Promise<U>,
    ): Promise<Array<U>>;
    queue: number;
  }

  declare function limitFactory<T = any>(
    concurrency?: number,
  ): limit<T>;

  declare module.exports: typeof limitFactory;
}
