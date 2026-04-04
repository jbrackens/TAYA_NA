import { useLocalStorage } from "./useLocalStorage";
import { useCallback } from "react";

export function useSearchHistory(initialValue: string[]) {
  const [entries, setEntries] = useLocalStorage("searchHistory", initialValue);

  const deleteHistoryEntry = useCallback(
    (entry: string) => setEntries(entries.filter(e => e !== entry)),
    [entries]
  );

  const addHistoryEntry = useCallback(
    (entry: string) => {
      // Don't allow empty or repetitive values
      if (!entry || entries.some(e => e === entry)) {
        return;
      }

      // Limit history array to 4 elements
      if (entries.length > 3) {
        entries.shift();
      }
      setEntries([...entries, entry]);
    },
    [entries]
  );

  const cleanHistory = useCallback(() => setEntries([]), [entries]);

  return {
    entries,
    deleteHistoryEntry,
    addHistoryEntry,
    cleanHistory
  };
}
