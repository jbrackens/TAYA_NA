import { useEffect, useRef } from "react";

export default function useUpdatePlayers(
  filter: string,
  searchQuery: string,
  selectedBrand?: string,
  filters?: { closed: boolean },
  actions?: any,
) {
  const firstUpdate = useRef(true);

  useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }

    actions.debouncedSearchPlayers({ tab: filter, query: { text: searchQuery, brandId: selectedBrand, filters } });
  }, [searchQuery, selectedBrand, filters, filter, actions]);
}
