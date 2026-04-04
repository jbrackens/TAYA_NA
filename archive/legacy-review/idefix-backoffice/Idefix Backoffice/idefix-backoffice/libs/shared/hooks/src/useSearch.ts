import { useState } from "react";
import { filterByKeys } from "@idefix-backoffice/shared/utils";

export function useSearch<T>(
  keys: (keyof T)[],
  values: T[]
): {
  query: string;
  setQuery: (value: string) => void;
  results: T[];
} {
  const [query, setQuery] = useState<string>("");
  const results = filterByKeys<T>(keys, query, values);

  return { query, setQuery, results };
}
