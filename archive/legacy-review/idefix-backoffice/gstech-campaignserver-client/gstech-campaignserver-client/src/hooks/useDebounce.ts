import { useState, useEffect } from "react";

export default function useDebounce(query: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState<string>(query);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(query);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [query, delay]);

  return debouncedValue;
}
