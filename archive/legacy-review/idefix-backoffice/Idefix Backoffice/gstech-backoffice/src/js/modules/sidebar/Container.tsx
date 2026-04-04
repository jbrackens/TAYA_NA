import React, { useCallback, useEffect } from "react";
import { bindActionCreators } from "@reduxjs/toolkit";
import { connect, useSelector } from "react-redux";
import isEmpty from "lodash/fp/isEmpty";
import find from "lodash/fp/find";
import { debouncedSearchPlayers, searchPlayers } from "../../core/data";
import { setInitialState } from "../transactions";
import Component from "./Component";
import {
  addStickyPlayer,
  changeFilter,
  changePlayerTab,
  changeSearchQuery,
  getCalculatedBadgeValues,
  getFilteredPlayers,
  getIsFetching,
  getPlayers,
  getSidebar,
  getStickyPlayers,
  getTasks,
  initialize,
  removeStickyPlayer,
  selectBrand,
  toggleFilter,
  updateLockedPlayers,
  updateSidebarStatus,
} from "./sidebarSlice";
import useUpdatePlayers from "./hooks/useUpdatePlayers";
import useUpdateLockedPlayers from "./hooks/useUpdateLockedPlayers";
import useUpdateSidebarStatus from "./hooks/useUpdateSidebarStatus";
import { AppDispatch } from "index";
import { PlayerWithUpdate } from "app/types";

interface Props {
  selectedPlayerId: number | null;
  actions: any;
}

const Sidebar = ({ selectedPlayerId, actions }: Props) => {
  const { searchQuery, selectedBrand, filters, filter, lockedPlayerUserMap, playerTabs } = useSelector(getSidebar);
  const summaryBadgeValues = useSelector(getCalculatedBadgeValues);
  const players = useSelector(getFilteredPlayers);
  const allPlayers = useSelector(getPlayers);
  const stickyPlayers = useSelector(getStickyPlayers);
  const isFetching = useSelector(getIsFetching);
  const rawTasks = useSelector(getTasks);

  const stickyPlayersIds = stickyPlayers?.map((stickyPlayer: PlayerWithUpdate) => stickyPlayer.id);
  const isContainsSticky = allPlayers?.filter((player: PlayerWithUpdate) => stickyPlayersIds?.includes(player.id)); // get sticky players from all players
  const tasks = selectedBrand ? find(["brandId", selectedBrand], rawTasks) : rawTasks;

  useEffect(() => {
    actions.initialize(selectedPlayerId);
    // eslint-disable-next-line
  }, [actions]);

  useUpdateLockedPlayers(actions);
  useUpdateSidebarStatus(actions);
  useUpdatePlayers(filter, searchQuery, selectedBrand, filters, actions);

  const handlePlayerClick = useCallback(
    (player: PlayerWithUpdate, sticky?: boolean) => {
      actions.setInitialState();
      const lockedBy = !!lockedPlayerUserMap[player.id];
      const currentTab = playerTabs[player.id];

      if (!sticky) actions.addStickyPlayer(player.id);
      if (sticky && currentTab) return actions.changePlayerTab(player.id, currentTab);
      if (lockedBy) return actions.changePlayerTab(player.id, "player-info");
      if (!isEmpty(player.kycDocumentIds))
        return actions.changePlayerTab(player.id, `tasks/kyc/${player.kycDocumentIds![0]}`);
      if (!isEmpty(player.fraudIds)) return actions.changePlayerTab(player.id, `tasks/fraud/${player.fraudIds[0]}`);
      if (!isEmpty(player.withdrawals))
        return actions.changePlayerTab(player.id, `tasks/withdrawal/${player.withdrawals[0].id}`);

      return actions.changePlayerTab(player.id, "player-info");
    },
    [actions, lockedPlayerUserMap, playerTabs],
  );

  const handleChangeFilter = useCallback(
    (name: string) => {
      if (name === filter) {
        actions.debouncedSearchPlayers({ tab: filter, query: { text: searchQuery, brandId: selectedBrand, filters } });
      }

      actions.changeFilter(name);
    },
    [filter, searchQuery, selectedBrand, filters, actions],
  );

  const handleChangeTaskFilter = useCallback(
    (taskType: string) => {
      if (taskType === "all") {
        actions.searchPlayers({ tab: filter, query: { brandId: selectedBrand, filters } });
      } else {
        actions.searchPlayers({ tab: filter, query: { brandId: selectedBrand, filters }, taskType });
      }
    },
    [actions, filter, filters, selectedBrand],
  );

  return (
    <Component
      selectedPlayerId={selectedPlayerId}
      searchQuery={searchQuery}
      selectedBrand={selectedBrand}
      filters={filters}
      filter={filter}
      badgeValues={summaryBadgeValues}
      players={players}
      stickyPlayers={stickyPlayers}
      isContainsSticky={isContainsSticky}
      isFetching={isFetching}
      lockedPlayerUserMap={lockedPlayerUserMap}
      tasks={tasks}
      onPlayerClick={handlePlayerClick}
      onRemoveStickyPlayer={actions.removeStickyPlayer}
      onChangeFilter={handleChangeFilter}
      onChangeSearchQuery={actions.changeSearchQuery}
      onToggleFilter={actions.toggleFilter}
      onSelectBrand={actions.selectBrand}
      onChangeTaskFilter={handleChangeTaskFilter}
    />
  );
};

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  actions: bindActionCreators(
    {
      initialize,
      changeFilter,
      changeSearchQuery,
      toggleFilter,
      selectBrand,
      debouncedSearchPlayers,
      searchPlayers,
      updateLockedPlayers,
      updateSidebarStatus,
      setInitialState,
      addStickyPlayer,
      removeStickyPlayer,
      changePlayerTab,
    },
    dispatch,
  ),
});

export default connect(null, mapDispatchToProps)(Sidebar);
