/* @flow */
const { types } = require('pg');

const guard = function identity<T: mixed, K: mixed>(value: T, transform: (value: T) => K, defaultValue: K): K {
  try {
    return transform(value);
  } catch (e) {
    return defaultValue;
  }
};

const setTypeParser = (oid: number, parseFn: (value: string) => any) =>
  types.setTypeParser(oid, parseFn);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  guard,
  setTypeParser,
  sleep,
};
