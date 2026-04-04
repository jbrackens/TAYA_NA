import React, { ChangeEvent, useCallback } from "react";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import { PlayerBonus } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import Typography from "@material-ui/core/Typography";
import { DownloadCsvButton } from "../../../core/components/button";
import Search from "../../../core/components/search";
import useSearch from "../../../core/hooks/useSearch";

const columns = [
  { label: "Bonus", name: "bonus", align: "left", type: "text" },
  { label: "Status", name: "formattedStatus", align: "left", type: "text" },
  { label: "Initial Amount", name: "amount", align: "left", type: "text" },
  { label: "Wagering", name: "wagering", align: "left", type: "text" },
  { label: "Current Amount", name: "balance", align: "left", type: "text" },
  {
    label: "Credited",
    name: "created",
    align: "left",
    type: "custom",
    format: (value: string, { creditedBy }: { creditedBy: string }) =>
      `${value} ${creditedBy ? `(${creditedBy})` : ""}`,
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PlayerBonus>(columns);

export default ({
  bonuses,
  isLoading,
  onForfeit,
}: {
  bonuses: PlayerBonus[];
  isLoading: boolean;
  onForfeit: (bonus: PlayerBonus) => void;
}) => {
  const { query, setQuery, results } = useSearch<PlayerBonus>(searchBy, bonuses);
  const isEmpty = bonuses.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Bonuses</Typography>

      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={<DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="bonuses.csv" />}
      />

      <Table initialData={results} isLoading={isLoading} estimatedItemSize={65}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(_value: string, bonus: PlayerBonus) =>
            bonus.status === "active" ? (
              <Button color="primary" onClick={() => onForfeit(bonus)}>
                Forfeit
              </Button>
            ) : null
          }
        />
      </Table>
    </Box>
  );
};
