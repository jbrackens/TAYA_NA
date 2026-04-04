import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ChangeEvent, FC, useCallback } from "react";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import { makeStyles } from "@mui/styles";

import { PlayerAccount } from "@idefix-backoffice/idefix/types";
import {
  Column,
  ColumnProps,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const useStyles = makeStyles({
  table: {
    minWidth: 1394
  }
});

const columns = [
  { label: "WD", name: "canWithdraw", align: "left", type: "boolean", style: { maxWidth: 98 } },
  { label: "Type", name: "method", align: "left", type: "text", style: { minWidth: 164 } },
  {
    label: "Account",
    name: "account",
    align: "left",
    type: "text",
    style: { minWidth: 164, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }
  },
  { label: "Account holder", name: "accountHolder", align: "left", type: "text", style: { minWidth: 164 } },
  { label: "Created", name: "created", align: "left", type: "date", style: { minWidth: 164 } },
  { label: "Last used", name: "lastUsed", align: "left", type: "date", style: { minWidth: 164 } }
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

const PaymentAccountsTable: FC<Props> = ({
  accounts,
  isLoading,
  onToggleAccountActive,
  onToggleAccountWithdrawals,
  onKycClick
}) => {
  const classes = useStyles();
  const { query, setQuery, results } = useSearch<PlayerAccount>(searchBy, accounts);
  const isEmpty = accounts.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { PaymentAccountsTable };
