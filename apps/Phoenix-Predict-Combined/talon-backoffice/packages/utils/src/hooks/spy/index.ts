import { useEffect, useRef } from "react";
import { isEqual } from "lodash";

export type SpyCallbackProps<T = any> = {
  prevValues: T | undefined;
  values: T;
};

export const useSpy = <T = any>() => {
  const spy = (
    values: T,
    onChange: ({ values, prevValues }: SpyCallbackProps<T>) => void,
  ) => {
    const prevValuesRef = useRef<T>();
    useEffect(() => {
      prevValuesRef.current = values;
    }, [values]);
    const prevValues = prevValuesRef.current;

    useEffect(() => {
      if (!isEqual(prevValues, values)) {
        onChange({ values, prevValues });
      }
    }, [values]);
  };
  return { spy };
};
