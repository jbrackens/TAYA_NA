import React, { ChangeEvent, useCallback } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getSearchByKeys } from "../../../core/components/table";
import { format, formatWithMargin } from "../helpers";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import { ScreenShotButton } from "../../../core/components/button/Button";
import { createColumnsToCsv } from "../../../core/components/table/helpers";
import { formatMoneyFromCents } from "../../../core/helpers/formatMoneyFromCents";

const columns = [
  {
    label: "Title",
    name: "title",
    align: "left",
    type: "custom",
    format: formatWithMargin,
    style: { minWidth: 224 },
  },
  { label: "Real Money Bets", name: "realBets", align: "left", type: "text", style: { minWidth: 164 } },
  { label: "Bonus Bets", name: "bonusBets", align: "left", type: "custom", format },
  { label: "Withdrawable Winnings", name: "wdWinnings", align: "left", type: "custom", format },
  { label: "Compensations", name: "compensations", align: "right", type: "custom", format },
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(
  columns,
  ["realBets", "bonusBets", "wdWinnings", "compensations"],
  [
    { label: "Real Money Bets", name: "rawRealBets" },
    { label: "Bonus Bets", name: "rawBonusBets" },
    { label: "Withdrawable Winnings", name: "rawWdWinnings" },
    { label: "Compensations", name: "rawCompensations" },
  ],
);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [
  { key: "rawRealBets", format: formatMoneyFromCents },
  { key: "rawBonusBets", format: formatMoneyFromCents },
  { key: "rawWdWinnings", format: formatMoneyFromCents },
  { key: "rawCompensations", format: formatMoneyFromCents },
];

export default ({ items, isLoading, isSportsBook }: { items: any[]; isLoading: boolean; isSportsBook?: boolean }) => {
  const { query, setQuery, results } = useSearch<any>(searchBy, items);
  const isEmpty = items.length === 0;

  const filteredColumns = React.useMemo(() => {
    if (isSportsBook) {
      const updatedColumns = columns.map(column => ({ ...column }));
      const compIndex = updatedColumns.findIndex(column => column.name === "compensations");

      if (compIndex > 0) {
        updatedColumns[compIndex - 1].align = "right";
      }

      return updatedColumns.filter(column => column.name !== "compensations");
    }

    return columns;
  }, [isSportsBook]);

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">License</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <>
            <ScreenShotButton />
            <DownloadCsvButton
              headers={CSV_HEADERS}
              data={results}
              disabled={isEmpty}
              keysToFormat={keysToFormat}
              fileName="license.csv"
            />
          </>
        }
      />
      <Table initialData={results} isLoading={isLoading}>
        {filteredColumns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
