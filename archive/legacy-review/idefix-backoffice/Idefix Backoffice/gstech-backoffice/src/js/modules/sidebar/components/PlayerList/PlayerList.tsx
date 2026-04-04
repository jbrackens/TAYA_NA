import React, { memo } from "react";
import List from "@material-ui/core/List";
import Divider from "@material-ui/core/Divider";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/core/styles";
import usePlayersLists from "../../hooks/usePlayersLists";
import Loading from "../../../../core/components/Loading";
import { PlayerWithUpdate } from "app/types";

const useStyles = makeStyles(theme => ({
  sidebarScroll: {
    overflowY: "scroll",
  },
  sidebarLoading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
  },
}));

interface Props {
  players: PlayerWithUpdate[];
  stickyPlayers: PlayerWithUpdate[];
  isContainsSticky: PlayerWithUpdate[];
  filter: string;
  selectedPlayerId: number | null;
  lockedPlayerUserMap: {
    [key: number]: {
      id: number;
      handle: string;
    };
  };
  onPlayerClick: (player: PlayerWithUpdate, sticky?: boolean) => void;
  onRemoveStickyPlayer: () => void;
  isFetching: boolean;
  searchQuery: string;
}

const PlayersList = ({
  players,
  stickyPlayers,
  isContainsSticky,
  filter,
  selectedPlayerId,
  lockedPlayerUserMap,
  onPlayerClick,
  onRemoveStickyPlayer,
  isFetching,
  searchQuery,
}: Props) => {
  const classes = useStyles();
  const { stickyPlayersList, playersList } = usePlayersLists({
    players,
    stickyPlayers,
    isContainsSticky,
    onPlayerClick,
    onRemoveStickyPlayer,
    selectedPlayerId,
    filter,
    lockedPlayerUserMap,
    searchQuery,
  });

  if (isFetching) {
    return <Loading size={60} thickness={7} className={classes.sidebarLoading} />;
  }

  return (
    <List disablePadding>
      {stickyPlayersList}
      {stickyPlayers?.length > 0 && (
        <Box padding="16px 0 14px">
          <Divider
            style={{ height: 2, background: "linear-gradient(90.28deg, #F5F5F5 -0.39%, #2D3D6D 49.28%, #F5F5F5 100%)" }}
          />
        </Box>
      )}
      {playersList}
    </List>
  );
};

export default memo(PlayersList);
