import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, { ChangeEvent, FC, useCallback } from "react";

import {
  Column,
  ColumnProps,
  createColumnsToCsv,
  DownloadCsvButton,
  getSearchByKeys,
  ScreenShotButton,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { formatMoneyFromCents } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";
import { format, formatWithMargin } from "../helpers";

const columns = [
  {
    label: "Title",
    name: "title",
    align: "left",
    type: "custom",
    format: formatWithMargin,
    style: { minWidth: 224 }
  },
  { label: "Amount", name: "amount", align: "left", type: "custom", format, style: { minWidth: 164 } },
  { label: "Transactions", name: "transactions", align: "right", type: "custom", format, style: { minWidth: 164 } }
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(columns, ["amount"], [{ label: "Amount", name: "rawAmount" }]);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [{ key: "rawAmount", format: formatMoneyFromCents }];

interface Props {
  items: any[];
  isLoading: boolean;
}

const PaymentsSummaryTable: FC<Props> = ({ items, isLoading }) => {
  const { query, setQuery, results } = useSearch<any>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { PaymentsSummaryTable };
