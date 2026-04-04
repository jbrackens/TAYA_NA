import React, { ChangeEvent, useCallback } from "react";
import { PlayerAccount } from "app/types";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import Switch from "@material-ui/core/Switch";
import Button from "@material-ui/core/Button";
import { createStyles, makeStyles } from "@material-ui/core/styles";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";

const useStyles = makeStyles(theme =>
  createStyles({
    table: {
      minWidth: 1394,
    },
  }),
);

const columns = [
  { label: "WD", name: "canWithdraw", align: "left", type: "boolean", style: { maxWidth: 98 } },
  { label: "Type", name: "method", align: "left", type: "text", style: { minWidth: 164 } },
  {
    label: "Account",
    name: "account",
    align: "left",
    type: "text",
    style: { minWidth: 164, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  },
  { label: "Account holder", name: "accountHolder", align: "left", type: "text", style: { minWidth: 164 } },
  { label: "Created", name: "created", align: "left", type: "date", style: { minWidth: 164 } },
  { label: "Last used", name: "lastUsed", align: "left", type: "date", style: { minWidth: 164 } },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PlayerAccount>(columns);

interface Props {
  accounts: PlayerAccount[];
  isLoading: boolean;
  onToggleAccountActive: (accountId: number, active: boolean) => void;
  onToggleAccountWithdrawals: (accountId: number, withdrawals: boolean) => void;
  onKycClick: (account: PlayerAccount) => void;
}

export default ({ accounts, isLoading, onToggleAccountActive, onToggleAccountWithdrawals, onKycClick }: Props) => {
  const classes = useStyles();
  const { query, setQuery, results } = useSearch<PlayerAccount>(searchBy, accounts);
  const isEmpty = accounts.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Payment accounts</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={<DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="accounts.csv" />}
      />
      <Table initialData={results} isLoading={isLoading} className={classes.table}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Active"
          name="active"
          align="left"
          type="custom"
          style={{ minWidth: 98 }}
          format={(value: boolean, { id }: { id: number }) => (
            <Switch color="primary" checked={value} onChange={e => onToggleAccountActive(id, e.target.checked)} />
          )}
        />
        <Column
          label="Withdrawals"
          name="withdrawals"
          align="left"
          type="custom"
          style={{ minWidth: 98 }}
          format={(value: boolean, { id, allowWithdrawals }: { id: number; allowWithdrawals: boolean }) => (
            <Switch
              disabled={!allowWithdrawals}
              checked={value && allowWithdrawals}
              onChange={e => onToggleAccountWithdrawals(id, e.target.checked)}
              color="primary"
            />
          )}
        />
        <Column
          label="Verification"
          name="kyc"
          align="right"
          type="custom"
          style={{ minWidth: 132 }}
          format={(value: string, account: PlayerAccount) => (
            <Button onClick={() => onKycClick(account)} color="primary">
              {value}
            </Button>
          )}
        />
      </Table>
    </Box>
  );
};
