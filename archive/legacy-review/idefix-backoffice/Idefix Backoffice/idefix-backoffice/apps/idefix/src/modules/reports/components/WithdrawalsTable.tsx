import React, { ChangeEvent, FC, useCallback, useState } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import debounce from "lodash/debounce";
import { makeStyles } from "@mui/styles";

import {
  Column,
  ColumnProps,
  createColumnsToCsv,
  DownloadAllCsvButton,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { fetchFormattedReport } from "../helpers";

const useStyles = makeStyles({
  table: {
    minWidth: 1832
  }
});

const columns = [
  {
    label: "Time",
    name: "timestamp",
    align: "left",
    type: "date",
    style: { minWidth: 134 }
  },
  { label: "ID", name: "id", align: "left", type: "text", style: { minWidth: 158 } },
  {
    label: "Transaction ID",
    name: "externalTransactionId",
    align: "left",
    type: "text",
    style: { minWidth: 254, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }
  },
  { label: "Method", name: "method", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Account", name: "account", align: "left", type: "text", style: { minWidth: 162 } },
  {
    label: "Amount",
    name: "amount",
    align: "left",
    type: "text",
    style: { minWidth: 158 }
  },
  { label: "Currency", name: "currencyId", align: "left", type: "text", style: { minWidth: 78 } },
  { label: "Player name", name: "name", align: "left", type: "text", style: { minWidth: 162 } },
  {
    label: "Username",
    name: "username",
    align: "left",
    type: "text",
    style: { minWidth: 182, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }
  },
  { label: "Country", name: "countryId", align: "left", type: "text", style: { minWidth: 62 } },
  { label: "Accepted by", name: "handle", align: "left", type: "text", style: { minWidth: 82 } },
  { label: "Transaction key", name: "transactionKey", align: "right", type: "text", style: { minWidth: 218 } }
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(columns, ["amount"], [{ label: "Amount", name: "rawAmount" }]);

interface Props {
  items: any[];
  onFetchMoreData: (pageSize?: number, text?: string) => void;
  isLoading: boolean;
  values: any;
}

const WithdrawalsTable: FC<Props> = ({ items, onFetchMoreData, isLoading, values }) => {
  const classes = useStyles();
  const [query, setQuery] = useState<string>("");
  const isEmpty = items.length === 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounced = useCallback(
    debounce(query => onFetchMoreData(100, query), 500),
    [onFetchMoreData]
  );

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      setQuery(text);
      debounced(text);
    },
    [debounced]
  );

  const handleLoadMore = useCallback(
    (pageSize: number) => {
      onFetchMoreData(pageSize, query);
    },
    [onFetchMoreData, query]
  );

  const handleFetchAllPayments = useCallback(async () => {
    return await fetchFormattedReport("withdrawals", { ...values, pageSize: 9999999, text: query });
  }, [query, values]);

  return (
    <Box>
      <Typography variant="subtitle2">Withdrawals</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search by Transaction ID, Name, Amount, Account, Country, Transaction Key"
        disabled={false}
        buttons={
          <DownloadAllCsvButton
            headers={CSV_HEADERS}
            onFetchData={handleFetchAllPayments}
            disabled={isEmpty || isLoading}
            fileName="withdrawals.csv"
            tooltipText="Download all withdrawals"
          />
        }
      />
      <Table
        initialData={items}
        isLoading={isLoading}
        className={classes.table}
        displayRows={16}
        onLoadMore={handleLoadMore}
      >
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};

export { WithdrawalsTable };
