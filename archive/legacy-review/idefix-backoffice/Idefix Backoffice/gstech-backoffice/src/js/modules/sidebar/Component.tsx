import React from "react";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import Search from "./components/Search";
import FilterList from "./components/FilterList";
import Toolbar from "./components/Toolbar";
import PlayerList from "./components/PlayerList";
import TaskFilter from "./components/TaskFilter";
import { PlayerWithUpdate } from "app/types";

interface Props {
  selectedPlayerId: number | null;
  searchQuery: string;
  selectedBrand?: string;
  filters: { closed: boolean };
  filter: string;
  badgeValues: any;
  stickyPlayers: PlayerWithUpdate[];
  isContainsSticky: PlayerWithUpdate[];
  players: PlayerWithUpdate[];
  isFetching: boolean;
  lockedPlayerUserMap: { [key: number]: { id: number; handle: string } };
  tasks: any;
  onPlayerClick: (player: PlayerWithUpdate, sticky?: boolean) => void;
  onRemoveStickyPlayer: () => void;
  onChangeFilter: (name: string) => void;
  onChangeSearchQuery: () => void;
  onToggleFilter: (filter: string) => void;
  onSelectBrand: () => void;
  onChangeTaskFilter: (taskType: string) => void;
}

const Component = ({
  selectedPlayerId,
  searchQuery,
  selectedBrand,
  filters,
  filter,
  badgeValues,
  stickyPlayers,
  isContainsSticky,
  players,
  isFetching,
  lockedPlayerUserMap,
  tasks,
  onPlayerClick,
  onRemoveStickyPlayer,
  onChangeFilter,
  onChangeSearchQuery,
  onToggleFilter,
  onSelectBrand,
  onChangeTaskFilter,
}: Props) => (
  <Box display="flex" flexDirection="column" height="100%" bgcolor="#FAFAFA">
    <Box borderBottom="1px solid rgba(0, 0, 0, 0.12)">
      <FilterList onChangeFilter={onChangeFilter} badgeValues={badgeValues} />
      {filter !== "tasks" && <Search text={searchQuery} onChange={onChangeSearchQuery} />}
      {filter === "tasks" && <TaskFilter onChangeTaskFilter={onChangeTaskFilter} tasks={tasks} />}
    </Box>
    <Box flexGrow={1} height="100%" style={{ overflowY: "scroll" }}>
      <PlayerList
        players={players}
        stickyPlayers={stickyPlayers}
        isContainsSticky={isContainsSticky}
        selectedPlayerId={selectedPlayerId}
        lockedPlayerUserMap={lockedPlayerUserMap}
        filter={filter}
        onPlayerClick={onPlayerClick}
        onRemoveStickyPlayer={onRemoveStickyPlayer}
        isFetching={isFetching}
        searchQuery={searchQuery}
      />
    </Box>

    <Box>
      <Divider light />
      <Toolbar
        selectedBrand={selectedBrand}
        filters={filters}
        onToggleFilter={onToggleFilter}
        onSelectBrand={onSelectBrand}
      />
    </Box>
  </Box>
);
export default Component;
