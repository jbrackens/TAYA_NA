import { makeStyles } from "@mui/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, { ChangeEvent, FC, useCallback } from "react";

import {
  Column,
  ColumnProps,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { LimitHistory } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const useStyles = makeStyles({
  table: {
    minWidth: 1160
  }
});

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
    style: { minWidth: 112 }
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
      textOverflow: "ellipsis"
    }
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<LimitHistory>(columns);

interface Props {
  history: LimitHistory[];
  isLoadingHistory: boolean;
}

const HistoryTable: FC<Props> = ({ history, isLoadingHistory }) => {
  const classes = useStyles();
  const { query, setQuery, results } = useSearch<LimitHistory>(searchBy, history);
  const isEmpty = history.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { HistoryTable };
