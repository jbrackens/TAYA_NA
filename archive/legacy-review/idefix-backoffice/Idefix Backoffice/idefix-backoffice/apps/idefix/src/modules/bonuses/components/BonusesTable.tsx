import React, { ChangeEvent, FC, useCallback } from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

import {
  ColumnProps,
  getCsvHeaders,
  getSearchByKeys,
  DownloadCsvButton,
  Column,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { PlayerBonus } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

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
    format: (value: string, { creditedBy }: { creditedBy: string }) => `${value} ${creditedBy ? `(${creditedBy})` : ""}`
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PlayerBonus>(columns);

interface Props {
  bonuses: PlayerBonus[];
  isLoading: boolean;
  onForfeit: (bonus: PlayerBonus) => void;
}

const BonusesTable: FC<Props> = ({ bonuses, isLoading, onForfeit }) => {
  const { query, setQuery, results } = useSearch<PlayerBonus>(searchBy, bonuses);
  const isEmpty = bonuses.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { BonusesTable };
