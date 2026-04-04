import React, { ChangeEvent, FC, useCallback } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { dialogsSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";
import { ClosedAccount, DIALOG } from "@idefix-backoffice/idefix/types";

import {
  Table,
  Column,
  ColumnProps,
  getCsvHeaders,
  getSearchByKeys,
  DownloadCsvButton,
  Search
} from "@idefix-backoffice/idefix/components";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "First Name", name: "firstName", align: "left", type: "text" },
  { label: "Last Name", name: "lastName", align: "left", type: "text" },
  { label: "Email", name: "email", align: "left", type: "text" },
  { label: "Username", name: "username", align: "left", type: "text" },
  { label: "Brand", name: "brandId", align: "left", type: "text" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<ClosedAccount>(columns);

interface Props {
  payload: unknown;
  meta?: unknown;
}

const ShowPlayersWithClosedAccountsDialog: FC<Props> = () => {
  const dispatch = useAppDispatch();
  const { isLoadingPlayers, players } = useAppSelector(state => state.accountStatus);
  const { query, setQuery, results } = useSearch<ClosedAccount>(searchBy, players);
  const isEmpty = players.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  const handleClose = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.SHOW_PLAYERS_WITH_CLOSED_ACCOUNTS)),
    [dispatch]
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <DialogTitle>Matching player details on all brands</DialogTitle>
      <DialogContent>
        <Box>
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

export { ShowPlayersWithClosedAccountsDialog };
