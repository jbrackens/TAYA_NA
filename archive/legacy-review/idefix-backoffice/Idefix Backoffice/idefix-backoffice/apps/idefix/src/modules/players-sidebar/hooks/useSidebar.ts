import { ChangeEvent, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";

import { sidebarSlice, playersSlice, appSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";

export const useSidebar = () => {
  const dispatch = useAppDispatch();
  const tab = useAppSelector(sidebarSlice.getTab);
  const selectedBrand = useAppSelector(sidebarSlice.getSelectedBrand);
  const searchQuery = useAppSelector(sidebarSlice.getSearchQuery);
  const filters = useAppSelector(sidebarSlice.getFilters);
  const players = useAppSelector(playersSlice.getFilteredPlayers);
  const stickyPlayers = useAppSelector(playersSlice.getStickyPlayers);
  const brands = useAppSelector(appSlice.getBrands);
  const { playerId } = useParams<{ playerId: string }>();

  const handleSelectBrand = useCallback(
    (brandId: string) => {
      dispatch(sidebarSlice.selectBrand(brandId));
      dispatch(
        playersSlice.searchPlayers({
          tab,
          query: { text: searchQuery, brandId: brandId === "all" ? undefined : brandId, filters }
        })
      );
    },
    [dispatch, filters, searchQuery, tab]
  );

  const handleToggleFilter = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      dispatch(sidebarSlice.toggleFilter("closed"));
      dispatch(
        playersSlice.searchPlayers({
          tab,
          query: { text: searchQuery, brandId: selectedBrand, filters: { closed: checked } }
        })
      );
    },
    [dispatch, searchQuery, selectedBrand, tab]
  );

  useEffect(() => {
    dispatch(sidebarSlice.initialize(Number(playerId)));
  }, [dispatch, playerId]);

  return {
    players,
    stickyPlayers,
    tab,
    brands,
    filters,
    selectedBrand,
    handleSelectBrand,
    handleToggleFilter
  };
};
