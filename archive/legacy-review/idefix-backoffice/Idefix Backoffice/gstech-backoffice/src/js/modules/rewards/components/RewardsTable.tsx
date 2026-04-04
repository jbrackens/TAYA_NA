import React, { ChangeEvent, useCallback } from "react";
import { PlayerSentContent } from "app/types";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";

import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import Table, { Column, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";

interface Props {
  ledgers: any[];
  isLoading: boolean;
  onAddReward: () => void;
  groupName: string;
  columns: any[];
}

export default ({ ledgers, isLoading, onAddReward, groupName, columns }: Props) => {
  const CSV_HEADERS = getCsvHeaders(columns).filter(({ label }) => !["Info", "Actions"].includes(label));
  const searchBy = getSearchByKeys<PlayerSentContent>(columns);
  const { query, setQuery, results } = useSearch<PlayerSentContent>(searchBy, ledgers);
  const isEmpty = ledgers.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
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
