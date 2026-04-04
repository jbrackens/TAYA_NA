interface IPaginateParams {
  perPage: number;
  currentPage: number;
  isFromStart?: boolean;
  isLengthAware?: boolean;
}

declare type Knex$OrderByDirection = 'asc' | 'desc' | 'ASC' | 'DESC';

declare type Knex$QueryBuilderFn<R> = (qb: Knex$QueryBuilder<R>) => Knex$QueryBuilder<R> | void;

declare type Knex$Value<R = any> =
  | string
  | number
  | boolean
  | null
  | Date
  | Array<string>
  | Array<number>
  | Array<Date>
  | Array<boolean>
  | Buffer
  | { [key: string]: any }
  | Knex$Raw<R>;

declare class Knex$JoinClause<R> {
  on(raw: Knex$Raw<R>): this;
  on(callback: Knex$QueryBuilderFn<R>): this;
  on(columns: {
    [key: string]: string | Knex$Raw<R>,
  }): this;
  on(column1: string, column2: string): this;
  on(column1: string, raw: Knex$Value<R>): this;
  on(column1: string, operator: string, column2: string | Knex$Raw<R>): this;
  andOn(raw: Knex$Raw<R>): this;
  andOn(callback: Knex$QueryBuilderFn<R>): this;
  andOn(columns: {
    [key: string]: string | Knex$Raw<R>,
  }): this;
  andOn(column1: string, column2: string): this;
  andOn(column1: string, raw: Knex$Raw<R>): this;
  andOn(column1: string, operator: string, column2: string | Knex$Raw<R>): this;
  orOn(raw: Knex$Raw<R>): this;
  orOn(callback: Knex$QueryBuilderFn<R>): this;
  orOn(columns: {
    [key: string]: string | Knex$Raw<R>,
  }): this;
  orOn(column1: string, column2: string): this;
  orOn(column1: string, raw: Knex$Raw<R>): this;
  orOn(column1: string, operator: string, column2: string | Knex$Raw<R>): this;
  onVal(column1: string, value: Knex$Value<R>): this;
  onVal(column1: string, operator: string, value: Knex$Value<R>): this;
  andOnVal(column1: string, value: Knex$Value<R>): this;
  andOnVal(column1: string, operator: string, value: Knex$Value<R>): this;
  orOnVal(column1: string, value: Knex$Value<R>): this;
  orOnVal(column1: string, operator: string, value: Knex$Value<R>): this;
  onIn(column1: string, values: $ReadOnlyArray<any> | Knex$Raw<R> | Knex$QueryBuilder<R>): this;
  andOnIn(column1: string, values: $ReadOnlyArray<any> | Knex$Raw<R> | Knex$QueryBuilder<R>): this;
  orOnIn(column1: string, values: $ReadOnlyArray<any> | Knex$Raw<R> | Knex$QueryBuilder<R>): this;
  onNotIn(column1: string, values: $ReadOnlyArray<any> | Knex$Raw<R> | Knex$QueryBuilder<R>): this;
  andOnNotIn(
    column1: string,
    values: $ReadOnlyArray<any> | Knex$Raw<R> | Knex$QueryBuilder<R>,
  ): this;
  orOnNotIn(
    column1: string,
    values: $ReadOnlyArray<any> | Knex$Raw<R> | Knex$QueryBuilder<R>,
  ): this;
  onNull(column1: string): this;
  andOnNull(column1: string): this;
  orOnNull(column1: string): this;
  onNotNull(column1: string): this;
  andOnNotNull(column1: string): this;
  orOnNotNull(column1: string): this;
  onExists(qb: Knex$QueryBuilderFn<R>): this;
  andOnExists(qb: Knex$QueryBuilderFn<R>): this;
  orOnExists(qb: Knex$QueryBuilderFn<R>): this;
  onNotExists(qb: Knex$QueryBuilderFn<R>): this;
  andOnNotExists(qb: Knex$QueryBuilderFn<R>): this;
  orOnNotExists(qb: Knex$QueryBuilderFn<R>): this;
  onBetween(column1: string, range: [any, any]): this;
  andOnBetween(column1: string, range: [any, any]): this;
  orOnBetween(column1: string, range: [any, any]): this;
  onNotBetween(column1: string, range: [any, any]): this;
  andOnNotBetween(column1: string, range: [any, any]): this;
  orOnNotBetween(column1: string, range: [any, any]): this;
  onJsonPathEquals(
    columnFirst: string,
    jsonPathFirst: string,
    columnSecond: string,
    jsonPathSecond: string,
  ): this;
  orOnJsonPathEquals(
    columnFirst: string,
    jsonPathFirst: string,
    columnSecond: string,
    jsonPathSecond: string,
  ): this;
  using(
    column:
      | string
      | $ReadOnlyArray<string>
      | Knex$Raw<R>
      | {
          [key: string]: string | Knex$Raw<R>,
        },
  ): this;
  type(type: string): this;
}

declare interface Knex$OnConflictQueryBuilder<R> {
  ignore(): Knex$QueryBuilder<R>;
  merge(mergeColumns?: $Keys<R>[]): Knex$QueryBuilder<R>;
  merge(data?: { [key: string]: any }): Knex$QueryBuilder<R>;
}

declare class Knex$Transaction<R> mixins Knex$QueryBuilder<R>, events$EventEmitter, Promise<R> {
  [[call]]: (tableName: string | { [string]: any, ... } | Knex$Raw<R>) => Knex$QueryBuilder<R>;
  commit(connection?: any, value?: any): Promise<R>;
  rollback(?Error): Promise<R>;
  savepoint(connection?: any): Promise<R>;
  raw(sqlString: string, bindings?: Knex$RawBindings): Knex$Raw<R>;
  transactionProvider(): (() => Promise<Knex$Transaction<R>>);
  isCompleted(): boolean;
}

declare class Knex$Raw<R> mixins events$EventEmitter, Promise<R> {
  wrap(before: string, after: string): this;
  debug(namespace?: Array<'query' | 'tx' | '*'>): this;
}

declare class Knex$QueryBuilder<R> mixins Knex$JoinClause<R>, Promise<R> {
  clearSelect(): this;
  clearWhere(): this;
  clearOrder(): this;
  clearCounters(): this;
  select(...key: Array<string | Knex$QueryBuilder<R> | Knex$Raw<R> | { [string]: any, ... }>): this;
  select(key: Array<string | Knex$QueryBuilder<R> | Knex$Raw<R> | { [string]: any, ... }>): this;
  select({ [string]: any, ... }): this;
  timeout(ms: number, options?: { cancel: boolean, ... }): this;
  column(key: string[]): this;
  column(...key: string[]): this;
  with(alias: string, w: string | Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  withRecursive(alias: string, w: string | Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  withSchema(schema: string): this;
  returning(column: string): this;
  returning(...columns: string[]): this;
  returning(columns: (string | Knex$Raw<R>)[]): this;
  as(name: string): this;
  transacting(trx: Knex$Knex<R> | ?Knex$Transaction<R>): this;
  transacting(trx: ?Knex$Transaction<R>): this;
  transaction((trx: Knex$Transaction<any>) => Promise<any>): this;
  where(builder: Knex$QueryBuilderFn<R> | Knex$Raw<R>): this;
  where(column: string, value: any): this;
  where(column: string | Knex$Raw<R>, operator: string, value: any): this;
  where(object: { [string]: any, ... }): this;
  whereNot(builder: Knex$QueryBuilderFn<R> | Knex$Raw<R>): this;
  whereNot(column: string, value: any): this;
  whereNot(column: string, operator: string, value: any): this;
  whereNot(object: { [string]: any, ... }): this;
  whereIn(
    column: string | Knex$Raw<R>,
    values: any[] | Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R> | Knex$Raw<R>,
  ): this;
  whereNotIn(
    column: string | Knex$Raw<R>,
    values: any[] | Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R> | Knex$Raw<R>,
  ): this;
  whereNull(column: string): this;
  whereNotNull(column: string): this;
  whereExists(builder: Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  whereNotExists(builder: Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  whereBetween<T>(column: string | Knex$Raw<R>, range: [T, T]): this;
  whereBetween(column: string | Knex$Raw<R>, range: number[]): this;
  whereNotBetween<T>(column: string, range: [T, T]): this;
  whereNotBetween(column: string, range: number[]): this;
  whereLike(
    column: string | Knex$Raw<R>,
    value: string | Knex$Raw<R> | Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>,
  ): this;
  whereILike(
    column: string | Knex$Raw<R>,
    value: string | Knex$Raw<R> | Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>,
  ): this;
  whereJsonObject(
    column: string,
    value:
      | string
      | { [string]: any, ... }
      | Knex$QueryBuilderFn<R>
      | Knex$QueryBuilder<R>
      | Knex$Raw<R>,
  ): this;
  whereJsonSupersetOf(
    column: string,
    value:
      | string
      | { [string]: any, ... }
      | Knex$QueryBuilderFn<R>
      | Knex$QueryBuilder<R>
      | Knex$Raw<R>,
  ): this;
  whereJsonSubsetOf(
    column: string,
    value:
      | string
      | { [string]: any, ... }
      | Knex$QueryBuilderFn<R>
      | Knex$QueryBuilder<R>
      | Knex$Raw<R>,
  ): this;
  whereJsonPath(column: string, jsonPath: string, operator: string, value: any): this;
  whereRaw(sql: string | Knex$Raw<R>, bindings?: Knex$RawBindings): this;
  whereRaw(sql: string | Knex$Raw<R>, ...values: any): this;
  orWhere(builder: Knex$QueryBuilderFn<R> | Knex$Raw<R>): this;
  orWhere(column: string, value: any): this;
  orWhere(column: string | Knex$Raw<R>, operator: string, value: any): this;
  orWhere(object: { [string]: any, ... }): this;
  orWhereRaw(sql: string | Knex$Raw<R>, bindings?: Knex$RawBindings): this;
  orWhereRaw(sql: string | Knex$Raw<R>, ...values: any): this;
  orWhereNot(builder: Knex$QueryBuilderFn<R>): this;
  orWhereNot(column: string, value: any): this;
  orWhereNot(column: string, operator: string, value: any): this;
  orWhereNot(object: { [string]: any, ... }): this;
  orWhereIn(column: string | Knex$Raw<R>, values: any[]): this;
  orWhereNotIn(column: string, values: any[]): this;
  orWhereNull(column: string): this;
  orWhereNotNull(column: string): this;
  orWhereExists(builder: Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  orWhereNotExists(builder: Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  orWhereBetween<T>(column: string, range: [T, T]): this;
  orWhereNotBetween<T>(column: string, range: [T, T]): this;
  orWhereLike(
    column: string | Knex$Raw<R>,
    value: string | Knex$Raw<R> | Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>,
  ): this;
  orWhereILike(
    column: string | Knex$Raw<R>,
    value: string | Knex$Raw<R> | Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>,
  ): this;
  join(table: string, c1: string, operator: string, c2: string): this;
  join(table: string, c1: string, c2: string): this;
  join(builder: Knex$QueryBuilder<R> | Knex$QueryBuilderFn<R>, c1?: string, c2?: string): this;
  join(table: string, builder: Knex$QueryBuilderFn<R>): this;
  join(table: string, c1: string, operator: string, c2: string): this;
  join(table: string | { [key: string]: any } | Knex$Raw<R> | Knex$QueryBuilder<R>, obj: { [key: string]: any }): this;
  innerJoin(table: string, c1: string | Knex$Raw<R>, c2: string | Knex$Raw<R>): this;
  innerJoin(builder: Knex$QueryBuilder<R>, obj: { [key: string]: any }): this;
  innerJoin(builder: Knex$QueryBuilder<R> | Knex$QueryBuilderFn<R>, c1?: string, c2?: string): this;
  innerJoin(table: string, builder: Knex$QueryBuilderFn<R> | mixed): this;
  innerJoin(raw: Knex$Raw<R>): this;
  leftJoin(table: string | { [key: string]: any }, c1: string, operator: string, c2: string): this;
  leftJoin(
    table: string | { [key: string]: any } | Knex$Raw<R> | Knex$QueryBuilder<R>,
    c1: string | Knex$Raw<R>,
    c2: string | Knex$Raw<R>,
  ): this;
  leftJoin(builder: Knex$QueryBuilder<R>): this;
  leftJoin(builder: Knex$QueryBuilder<R>, obj: { [key: string]: any }): this;
  leftJoin(
    table: string | { [key: string]: any } | Knex$Raw<R> | Knex$QueryBuilder<R>,
    builder: Knex$QueryBuilderFn<R>,
  ): this;
  leftJoin(table: string, obj: { [key: string]: any }): this;
  leftJoin(raw: Knex$Raw<R>): this;
  leftOuterJoin(table: string | Knex$Raw<R>, c1: string, operator: string, c2: string): this;
  leftOuterJoin(table: string | Knex$Raw<R>, c1: string, c2: string): this;
  leftOuterJoin(table: string | Knex$Raw<R>, query: any): this;
  rightJoin(table: string, c1: string, operator: string, c2: string): this;
  rightJoin(table: string, c1: string, c2: string): this;
  rightJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  rightOuterJoin(table: string, c1: string, operator: string, c2: string): this;
  rightOuterJoin(table: string, c1: string, c2: string): this;
  rightOuterJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  outerJoin(table: string, c1: string, operator: string, c2: string): this;
  outerJoin(table: string, c1: string, c2: string): this;
  outerJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  fullOuterJoin(table: string, c1: string, operator: string, c2: string): this;
  fullOuterJoin(table: string, c1: string, c2: string): this;
  fullOuterJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  crossJoin(table: string): this;
  crossJoin(column: string, c1: string, c2: string): this;
  crossJoin(column: string, c1: string, operator: string, c2: string): this;
  crossJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  crossJoin({ [string]: any, ... }): this;
  joinRaw(sql: string | Knex$Raw<R>, bindings?: Knex$RawBindings): this;
  distinct(...columns: string[]): this;
  distinct(columns: { [string]: any, ... }): this;
  distinctOn(...columns: string[]): this;
  groupBy(column: string): this;
  groupBy(...columns: string[]): this;
  groupByRaw(sql: string, bindings?: Knex$RawBindings): this;
  orderBy(
    column:
      | string
      | Array<
          | string
          | {
              column: string,
              order?: Knex$OrderByDirection,
              ...
            },
        >
      | Knex$Raw<R>,
    direction?: Knex$OrderByDirection,
  ): this;

  orderByRaw(sql: string, bindings?: Knex$RawBindings): this;
  offset(offset: number): this;
  limit(limit: number): this;
  having(raw: Knex$Raw<R>): this;
  having(column: string | Knex$Raw<R>, operator: string, value: mixed): this;
  havingIn(column: string, values: Array<mixed>): this;
  havingNotIn(column: string, values: Array<mixed>): this;
  havingNull(column: string): this;
  havingNotNull(column: string): this;
  havingExists(builder: Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  havingNotExists(builder: Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  havingBetween<T>(column: string, range: [T, T]): this;
  havingNotBetween<T>(column: string, range: [T, T]): this;
  havingRaw(column: string, operator: string, value: mixed): this;
  havingRaw(column: string, value: mixed): this;
  havingRaw(raw: string, bindings?: Knex$RawBindings): this;
  union(): this;
  union(Knex$QueryBuilder<R>[], wrap?: boolean): this;
  unionAll(): this;
  unionAll(Knex$QueryBuilder<R>[]): this;
  count(column?: string | string[] | { [string]: any, ... } | Knex$Raw<R>): this;
  countDistinct(column?: string | string[] | { [string]: any, ... } | Knex$Raw<R>): this;
  max(column?: string | string[] | { [string]: any, ... } | Knex$Raw<R>): this;
  sum(column?: string | string[] | { [string]: any, ... } | Knex$Raw<R>): this;
  min(column?: string | string[] | { [string]: any, ... } | Knex$Raw<R>): this;
  sumDistinct(column?: string | string[] | { [string]: any, ... } | Knex$Raw<R>): this;
  avg(column?: string | string[] | { [string]: any, ... } | Knex$Raw<R>): this;
  avgDistinct(column?: string | string[] | { [string]: any, ... } | Knex$Raw<R>): this;
  pluck(column: string): this;
  first(...key: Array<string | Knex$QueryBuilder<R> | Knex$Raw<R> | { [string]: any, ... }>): this;
  first(key: Array<string | Knex$QueryBuilder<R> | Knex$Raw<R> | { [string]: any, ... }>): this;
  first({ [string]: any, ... }): this;
  clone(): this;
  modify(fn: (queryBuilder: Knex$QueryBuilder<R>, ...args: any[]) => any, ...args: any[]): this;
  connection(dbConnection: any): this;

  table(table: string, options?: Object): this;
  from(table: string): this;
  from(builder: Knex$QueryBuilderFn<R> | Knex$Knex<R> | Knex$QueryBuilder<R>): this;
  from(fn: (queryBuilder: Knex$QueryBuilder<R>) => Knex$QueryBuilder<R>): this;
  from({ [string]: any, ... }): this;
  from(table: Knex$Raw<R>): this;
  into(table: string, options?: Object): this;
  truncate(): this;
  insert(val: Object | Object[]): this;
  insert(values: mixed, returns: ?(string[])): this;
  insert(values: mixed, ...returns: string[]): this;
  del(): this;
  delete(): this;
  onConflict(columns: string): Knex$OnConflictQueryBuilder<R>;
  onConflict(columns: string[]): Knex$OnConflictQueryBuilder<R>;
  onConflict(raw: Knex$Raw<R>): Knex$OnConflictQueryBuilder<R>;
  onConflict(): Knex$OnConflictQueryBuilder<R>;
  update(column: string, value: any, returning?: Array<string>): this;
  update(val: Object, returning?: Array<string>): this;
  forUpdate(): this;
  forShare(): this;
  ref(name: string): this;
  decrement(columnName: string, amount: number): this;
  increment(columnName: string, amount: number): this;
  andWhere(builder: Knex$QueryBuilderFn<R> | Knex$Raw<R>): this;
  stream(options?: { highWaterMark?: number }): stream$Readable;
  pipe(stream: stream$Writable): stream$Readable;
  _statements: any[];
  paginate(params: IPaginateParams): this;
  debug(namespace?: Array<'query' | 'tx' | '*'>): this;
  onNull(column: string): this;
}

type MigrateConfig = {
  directory?: string,
  extension?: string,
  tableName?: string,
  disableTransactions?: boolean,
  loadExtensions?: Array<string>,
};

declare class Knex$Knex<R> mixins Knex$QueryBuilder<R>, Promise<R>, events$EventEmitter {
  static (config: Knex$Config): Knex$Knex<R>;
  static QueryBuilder: typeof Knex$QueryBuilder;
  [[call]]: (tableName: string | { [string]: any, ... } | Knex$Raw<R>) => Knex$QueryBuilder<R>;
  raw(sqlString: string, bindings?: Knex$RawBindings | Array<mixed>): Knex$Raw<R>;
  batchInsert: (tableName: string, rows: Array<Object>, chunkSize?: number) => Knex$QueryBuilder<R>;
  migrate: {
    make: (name: string, config?: MigrateConfig) => Promise<string>,
    latest: (config?: MigrateConfig) => Promise<void>,
    rollback: (config?: MigrateConfig) => Promise<void>,
    currentVersion: (config?: MigrateConfig) => Promise<string>,
    ...
  };
  client: any;
  destroy(): Promise<void>;
  transactionProvider(): (() => Promise<Knex$Transaction<R>>);
}

declare type Knex$PostgresConfig = {
  client?: 'pg',
  connection?:
    | string
    | {
        host?: string,
        user?: string,
        password?: string,
        database?: string,
        charset?: string,
        ...
      },
  searchPath?: string,
  ...
};

declare type Knex$RawBindings = Array<mixed> | { [key: string]: mixed, ... } | mixed;

declare type Knex$Mysql2Config = {
  client?: 'mysql2',
  connection?:
    | string
    | {
        host?: string,
        user?: string,
        password?: string,
        database?: string,
        charset?: string,
        ...
      },
  ...
};

declare type Knex$MysqlConfig = {
  client?: 'mysql',
  connection?: {
    host?: string,
    user?: string,
    password?: string,
    database?: string,
    ...
  },
  ...
};

declare type Knex$SqliteConfig = {
  client?: 'sqlite3',
  connection?: { filename?: string, ... },
  ...
};
declare type Knex$Config =
  | Knex$PostgresConfig
  | Knex$MysqlConfig
  | Knex$Mysql2Config
  | Knex$SqliteConfig;

declare module 'knex' {
  declare type Error = {
    name: string,
    length: number,
    severity: string,
    code: string,
    detail: string,
    hint?: string,
    position?: any,
    internalPosition?: any,
    internalQuery?: any,
    where?: any,
    schema: string,
    table: string,
    column?: any,
    dataType?: any,
    constraint?: string,
    file: string,
    line: string,
    routine: string,
    ...
  };
  declare type Knex = Knex$Knex<any>;
  declare type $QueryBuilder<R> = Knex$QueryBuilder<R>;
  declare module.exports: typeof Knex$Knex;
}
