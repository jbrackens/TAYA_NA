import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ChangeEvent, FC, useCallback } from "react";

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
  { label: "Real Money Bets", name: "realBets", align: "left", type: "text", style: { minWidth: 164 } },
  { label: "Bonus Bets", name: "bonusBets", align: "left", type: "custom", format },
  { label: "Withdrawable Winnings", name: "wdWinnings", align: "left", type: "custom", format },
  { label: "Compensations", name: "compensations", align: "right", type: "custom", format }
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(
  columns,
  ["realBets", "bonusBets", "wdWinnings", "compensations"],
  [
    { label: "Real Money Bets", name: "rawRealBets" },
    { label: "Bonus Bets", name: "rawBonusBets" },
    { label: "Withdrawable Winnings", name: "rawWdWinnings" },
    { label: "Compensations", name: "rawCompensations" }
  ]
);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [
  { key: "rawRealBets", format: formatMoneyFromCents },
  { key: "rawBonusBets", format: formatMoneyFromCents },
  { key: "rawWdWinnings", format: formatMoneyFromCents },
  { key: "rawCompensations", format: formatMoneyFromCents }
];

interface Props {
  items: any[];
  isLoading: boolean;
}

const LicenseTable: FC<Props> = ({ items, isLoading }) => {
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
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};

export { LicenseTable };
