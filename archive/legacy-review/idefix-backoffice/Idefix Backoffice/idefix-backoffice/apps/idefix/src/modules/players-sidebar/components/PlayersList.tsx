import { FC } from "react";
import List from "@mui/material/List";
import LinearProgress from "@mui/material/LinearProgress";

import { PlayerWithUpdate } from "@idefix-backoffice/idefix/types";

import { PlayersListItem } from "./PlayersListItem";
import { Divider } from "@mui/material";
import { usePlayerList } from "../hooks/usePlayerList";

interface Props {
  players: PlayerWithUpdate[];
  stickyPlayers: PlayerWithUpdate[];
  tab: string;
}

const PlayersList: FC<Props> = ({ players = [], stickyPlayers = [], tab }) => {
  const { handleClick, handleRemove, isFetching } = usePlayerList();
  return (
    <List disablePadding>
      <>
        {isFetching && <LinearProgress sx={{ position: "absolute", width: "100%" }} />}
        {stickyPlayers.map(player => (
          <PlayersListItem key={player.id} player={player} onClick={handleClick} onRemove={handleRemove} tab={tab} />
        ))}
        <Divider />
        {players.map(player => (
          <PlayersListItem key={player.id} player={player} onClick={handleClick} tab={tab} />
        ))}
      </>
    </List>
  );
};

export { PlayersList };
