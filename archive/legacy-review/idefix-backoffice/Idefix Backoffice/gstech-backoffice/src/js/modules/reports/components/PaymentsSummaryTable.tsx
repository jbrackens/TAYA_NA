import React, { ChangeEvent, useCallback } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

import { format, formatWithMargin } from "../helpers";
import Table, { Column, ColumnProps, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import { ScreenShotButton } from "../../../core/components/button/Button";
import { formatMoneyFromCents } from "../../../core/helpers/formatMoneyFromCents";
import { createColumnsToCsv } from "../../../core/components/table/helpers";

const columns = [
  {
    label: "Title",
    name: "title",
    align: "left",
    type: "custom",
    format: formatWithMargin,
    style: { minWidth: 224 },
  },
  { label: "Amount", name: "amount", align: "left", type: "custom", format, style: { minWidth: 164 } },
  { label: "Transactions", name: "transactions", align: "right", type: "custom", format, style: { minWidth: 164 } },
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(columns, ["amount"], [{ label: "Amount", name: "rawAmount" }]);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [{ key: "rawAmount", format: formatMoneyFromCents }];

export default ({ items, isLoading }: { items: any[]; isLoading: boolean }) => {
  const { query, setQuery, results } = useSearch<any>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Risks</Typography>
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
              fileName="risks.csv"
            />
          </>
        }
      />
      <Table initialData={results} isLoading={isLoading}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
