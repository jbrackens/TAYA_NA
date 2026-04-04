import { useState } from "react";
import filterByKeys from "../helpers/filterByKeys";

export default function <T>(
  keys: (keyof T)[],
  values: T[],
): {
  query: string;
  setQuery: (value: string) => void;
  results: T[];
} {
  const [query, setQuery] = useState<string>("");
  const results = filterByKeys<T>(keys, query, values);

  return { query, setQuery, results };
}
