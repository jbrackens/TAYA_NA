import React, { ChangeEvent, FC, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { RootState } from "js/rootReducer";
import { ClosedAccount } from "app/types";

import { closeDialog } from "../";
import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../core/components/table";
import Search from "../../core/components/search";
import { DownloadCsvButton } from "../../core/components/button";
import useSearch from "../../core/hooks/useSearch";

const columns = [
  { label: "First Name", name: "firstName", align: "left", type: "text" },
  { label: "Last Name", name: "lastName", align: "left", type: "text" },
  { label: "Email", name: "email", align: "left", type: "text" },
  { label: "Username", name: "username", align: "left", type: "text" },
  { label: "Brand", name: "brandId", align: "right", type: "text" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<ClosedAccount>(columns);

interface Props {
  payload: unknown;
  meta?: unknown;
}

const ShowPlayersWithClosedAccounts: FC<Props> = () => {
  const dispatch = useDispatch();
  const { isLoadingPlayers, players } = useSelector((state: RootState) => state.accountStatus);
  const { query, setQuery, results } = useSearch<ClosedAccount>(searchBy, players);
  const isEmpty = players.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("show-players-with-closed-accounts")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose} maxWidth={false}>
      <DialogTitle>Matching player details on all brands</DialogTitle>
      <DialogContent>
        <Box minWidth={980}>
          <Typography variant="subtitle2">Players</Typography>

          <Search
            value={query}
            onChange={handleSearchQuery}
            placeholder="Search"
            disabled={isEmpty}
            buttons={
              <DownloadCsvButton
                headers={CSV_HEADERS}
                data={results}
                disabled={isEmpty}
                fileName="players_closed_accounts.csv"
              />
            }
          />
          <Table initialData={players} isLoading={isLoadingPlayers} displayRows={6}>
            {columns.map(column => (
              <Column key={column.name} {...column} />
            ))}
          </Table>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleClose}>
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShowPlayersWithClosedAccounts;
