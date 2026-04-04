import React, { ChangeEvent, useCallback } from "react";
import { LimitHistory } from "app/types";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import Search from "../../../core/components/search";
import useSearch from "../../../core/hooks/useSearch";
import { DownloadCsvButton } from "../../../core/components/button";
import { createStyles, makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() =>
  createStyles({
    table: {
      minWidth: 1160,
    },
  }),
);

const columns = [
  { label: "Type", name: "type", align: "left", type: "text", style: { minWidth: 184 } },
  { label: "Status", name: "status", align: "left", type: "text", style: { minWidth: 172 } },
  { label: "Start time", name: "startTime", align: "left", type: "text", style: { minWidth: 132 } },
  { label: "End time", name: "endTime", align: "left", type: "text", style: { minWidth: 132 } },
  { label: "Limit", name: "amount", align: "left", type: "text", style: { minWidth: 132 } },
  { label: "Period type", name: "periodType", align: "left", type: "text", style: { minWidth: 102 } },
  {
    label: "Player cancellable",
    name: "isInternal",
    align: "left",
    type: "boolean",
    style: { minWidth: 112 },
  },
  {
    label: "Reason",
    name: "reason",
    align: "right",
    type: "text",
    style: {
      minWidth: 162,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    },
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<LimitHistory>(columns);

export default ({ history, isLoadingHistory }: { history: LimitHistory[]; isLoadingHistory: boolean }) => {
  const classes = useStyles();
  const { query, setQuery, results } = useSearch<LimitHistory>(searchBy, history);
  const isEmpty = history.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box display="flex" flexDirection="column">
      <Typography variant="subtitle2">History</Typography>

      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="limits-history.csv" />
        }
      />

      <Table initialData={results} isLoading={isLoadingHistory} className={classes.table}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
