import React, { useMemo, useState } from "react";
import { PlayerWithUpdate } from "app/types";
import PlayerListItem from "../components/PlayerList/PlayerListItem";

interface Props {
  players: PlayerWithUpdate[];
  stickyPlayers: PlayerWithUpdate[];
  isContainsSticky: PlayerWithUpdate[];
  onPlayerClick: (playerId: PlayerWithUpdate, isSticky?: boolean) => void;
  onRemoveStickyPlayer: (playerId: number) => void;
  selectedPlayerId: number | null;
  filter: string;
  lockedPlayerUserMap: {
    [key: number]: {
      id: number;
      handle: string;
    };
  };
  searchQuery: string;
}

export default ({
  players,
  stickyPlayers,
  isContainsSticky,
  onPlayerClick,
  onRemoveStickyPlayer,
  selectedPlayerId,
  filter,
  lockedPlayerUserMap,
  searchQuery,
}: Props) => {
  const [selectedPlayer, setSelectedPlayer] = useState(selectedPlayerId ? selectedPlayerId : null);

  const stickyPlayersList = useMemo(
    () =>
      stickyPlayers?.map(stickyPlayer => {
        const notStickyPlayerFiltered = isContainsSticky?.filter(player => player.id === stickyPlayer.id);
        const notStickyPlayer = notStickyPlayerFiltered?.length ? notStickyPlayerFiltered[0] : undefined;
        const isPendingDeposits = notStickyPlayer ? notStickyPlayer.pendingDeposits : false;
        const isLastPlayer = stickyPlayers.length && stickyPlayers[stickyPlayers.length - 1].id === stickyPlayer.id;

        const handleClick = () => {
          setSelectedPlayer(stickyPlayer.id);
          onPlayerClick(stickyPlayer, true);
        };

        const handleRemove = (playerId: number) => onRemoveStickyPlayer(playerId);

        return (
          <PlayerListItem
            key={stickyPlayer.id}
            player={stickyPlayer}
            isLastPlayer={isLastPlayer as boolean}
            isPendingDeposits={isPendingDeposits}
            selectedPlayer={selectedPlayer}
            filter={filter}
            lockedPlayerUserMap={lockedPlayerUserMap}
            onClick={handleClick}
            onRemove={handleRemove}
            searchQuery={searchQuery}
            notStickyPlayer={notStickyPlayer}
          />
        );
      }),
    [
      filter,
      isContainsSticky,
      lockedPlayerUserMap,
      onPlayerClick,
      onRemoveStickyPlayer,
      searchQuery,
      selectedPlayer,
      stickyPlayers,
    ],
  );

  const playersList = useMemo(
    () =>
      players?.map(player => {
        const handleClick = () => {
          setSelectedPlayer(player.id);
          onPlayerClick(player);
        };

        return (
          <PlayerListItem
            key={player.id}
            player={player}
            selectedPlayer={selectedPlayer}
            filter={filter}
            lockedPlayerUserMap={lockedPlayerUserMap}
            onClick={handleClick}
          />
        );
      }),
    [filter, lockedPlayerUserMap, onPlayerClick, players, selectedPlayer],
  );

  return { stickyPlayersList: stickyPlayersList ? stickyPlayersList : [], playersList: playersList ? playersList : [] };
};
