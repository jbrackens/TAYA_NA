import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import { FC } from "react";
import PlayersTable from "./components/PlayersTable";
import { useAddPlayerConnection } from "./hooks";

const AddPlayerConnection: FC = () => {
  const { players, searchQuery, selectedPlayers, isLoading, handleChangeSearch, handleCheckPlayer } =
    useAddPlayerConnection();

  return (
    <Box mt={1}>
      <TextField label="Find connected player accounts" value={searchQuery} onChange={handleChangeSearch} fullWidth />
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" width="672px" height="400px">
          <CircularProgress />
        </Box>
      ) : (
        <PlayersTable players={players} selectedPlayers={selectedPlayers} onCheck={handleCheckPlayer} />
      )}
    </Box>
  );
};

export { AddPlayerConnection };
