import transform from "lodash/transform";
import isEqual from "lodash/isEqual";

export const difference = <T extends Record<string, any>, P extends Partial<T>>(object: T, base: P): Partial<T> =>
  transform(
    object,
    (result: Partial<T>, value, key: keyof T) => {
      if (!isEqual(value, base[key])) {
        result[key] = value;
      }
    },
    {}
  );
