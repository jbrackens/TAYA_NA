import React, { ChangeEvent, FC, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import {
  Column,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { PlayerSentContent } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

interface Props {
  ledgers: any[];
  isLoading: boolean;
  onAddReward: () => void;
  groupName: string;
  columns: any[];
}

const RewardsTable: FC<Props> = ({ ledgers, isLoading, onAddReward, groupName, columns }) => {
  const CSV_HEADERS = getCsvHeaders(columns).filter(({ label }) => !["Info", "Actions"].includes(label));
  const searchBy = getSearchByKeys<PlayerSentContent>(columns);
  const { query, setQuery, results } = useSearch<PlayerSentContent>(searchBy, ledgers);
  const isEmpty = ledgers.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <>
            <Button onClick={() => onAddReward()}>Add {groupName}</Button>
            <DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="ledgers.csv" />
          </>
        }
      />

      <Table initialData={results} isLoading={isLoading} displayRows={12}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};

export { RewardsTable };
