import React, { ChangeEvent, useCallback, useState } from "react";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import debounce from "lodash/debounce";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import { SortDirection } from "@material-ui/core";

import Table, { Column, ColumnProps } from "../../../core/components/table";
import Search from "../../../core/components/search";
import { DownloadAllCsvButton } from "../../../core/components/button";
import { createColumnsToCsv } from "../../../core/components/table/helpers";
import { fetchFormattedReport } from "../helpers";

const useStyles = makeStyles(theme =>
  createStyles({
    table: {
      minWidth: 1832,
    },
  }),
);

const columns = [
  {
    label: "Time",
    name: "timestamp",
    align: "left",
    type: "date",
    style: { minWidth: 134 },
  },
  { label: "ID", name: "id", align: "left", type: "text", style: { minWidth: 158 } },
  {
    label: "Transaction ID",
    name: "externalTransactionId",
    align: "left",
    type: "text",
    style: { minWidth: 254, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  },
  { label: "Method", name: "method", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Account", name: "account", align: "left", type: "text", style: { minWidth: 162 } },
  {
    label: "Amount",
    name: "amount",
    align: "left",
    type: "text",
    style: { minWidth: 158 },
  },
  { label: "Currency", name: "currencyId", align: "left", type: "text", style: { minWidth: 78 } },
  { label: "Player name", name: "name", align: "left", type: "text", style: { minWidth: 162 } },
  {
    label: "Username",
    name: "username",
    align: "left",
    type: "text",
    style: { minWidth: 182, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  },
  { label: "Country", name: "countryId", align: "left", type: "text", style: { minWidth: 62 } },
  { label: "Accepted by", name: "handle", align: "left", type: "text", style: { minWidth: 82 } },
  { label: "Transaction key", name: "transactionKey", align: "right", type: "text", style: { minWidth: 218 } },
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(columns, ["amount"], [{ label: "Amount", name: "rawAmount" }]);

interface Props {
  items: any[];
  onFetchMoreData: (pageSize?: number, text?: string, sortBy?: string, sortDirection?: SortDirection) => void;
  isLoading: boolean;
  values: any;
}

export default ({ items, onFetchMoreData, isLoading, values }: Props) => {
  const classes = useStyles();
  const [query, setQuery] = useState<string>("");
  const isEmpty = items.length === 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounced = useCallback(
    debounce(
      (text, sortBy?: string, sortDirection?: SortDirection) => onFetchMoreData(100, text, sortBy, sortDirection),
      500,
    ),
    [onFetchMoreData],
  );

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      setQuery(text);
      debounced(text);
    },
    [debounced],
  );

  const handleLoadMore = useCallback(
    (pageSize: number, sortBy?: string, sortDirection?: SortDirection) => {
      onFetchMoreData(pageSize, query, sortBy, sortDirection);
    },
    [onFetchMoreData, query],
  );

  const handleFetchAllPayments = useCallback(async () => {
    return await fetchFormattedReport("withdrawals", { ...values, pageSize: 9999999, text: query });
  }, [query, values]);

  const handleSort = useCallback(
    (sortBy: string, sortDirection: SortDirection) => {
      debounced(query, sortBy, sortDirection);
    },
    [debounced, query],
  );

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
        onSort={handleSort}
      >
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
