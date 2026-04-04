import React from "react";
import TextField from "@material-ui/core/TextField";
import Box from "@material-ui/core/Box";
import CircularProgress from "@material-ui/core/CircularProgress";
import PlayersTable from "./components/PlayersTable";

interface AddPlayerConnectionProps {
  searchQuery: string;
  players: {
    fullName: string;
    id: number;
    email: string;
    brandId: string;
  }[];
  selectedPlayers: number[];
  isLoading: boolean;
  onCheckPlayer: (newId: number) => void;
  onChangeSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Component = ({
  searchQuery,
  onChangeSearch,
  players,
  selectedPlayers,
  onCheckPlayer,
  isLoading,
}: AddPlayerConnectionProps) => (
  <Box>
    <TextField label="Find connected player accounts" value={searchQuery} onChange={onChangeSearch} fullWidth />
    {isLoading ? (
      <Box display="flex" justifyContent="center" alignItems="center" width="672px" height="400px">
        <CircularProgress />
      </Box>
    ) : (
      <PlayersTable players={players} selectedPlayers={selectedPlayers} onCheck={onCheckPlayer} />
    )}
  </Box>
);

export default Component;
