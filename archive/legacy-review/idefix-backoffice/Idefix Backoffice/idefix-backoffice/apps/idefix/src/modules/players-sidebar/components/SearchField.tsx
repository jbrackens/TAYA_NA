import { ChangeEvent, FC, useCallback } from "react";
import TextField from "@mui/material/TextField";

import { sidebarSlice, playersSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";

const SearchField: FC = () => {
  const dispatch = useAppDispatch();
  const searchQuery = useAppSelector(sidebarSlice.getSearchQuery);
  const filters = useAppSelector(sidebarSlice.getFilters);
  const tab = useAppSelector(sidebarSlice.getTab);
  const brandId = useAppSelector(sidebarSlice.getSelectedBrand);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      dispatch(sidebarSlice.changeSearchQuery(query));
      dispatch(playersSlice.debouncedSearchPlayers({ tab, query: { text: query, brandId, filters } }));
    },
    [brandId, dispatch, filters, tab]
  );

  return <TextField fullWidth placeholder="Search player" size="small" value={searchQuery} onChange={handleChange} />;
};

export { SearchField };
