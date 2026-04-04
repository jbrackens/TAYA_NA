import React, { ChangeEvent, useCallback } from "react";
import { PlayerActiveCampaigns } from "app/types";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import { formatDate } from "../../../core/helpers/formatDate";

const columns = [
  {
    label: "Name",
    name: "name",
    align: "left",
    type: "text",
    style: { minWidth: 198 },
  },
  {
    label: "Added at",
    name: "addedAt",
    align: "left",
    type: "date",
    style: { minWidth: 158 },
  },
  {
    label: "Removed at",
    name: "removedAt",
    align: "left",
    type: "date",
    style: { minWidth: 158 },
  },
  {
    label: "Email sent at",
    name: "emailSentAt",
    align: "left",
    type: "date",
    style: { minWidth: 158 },
  },
  {
    label: "Sms sent at",
    name: "smsSentAt",
    align: "left",
    type: "date",
    style: { minWidth: 158 },
  },
  {
    label: "Complete",
    name: "complete",
    align: "right",
    type: "boolean",
    style: { minWidth: 98 },
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PlayerActiveCampaigns>(columns);

const keysToFormat = [
  { key: "addedAt", format: formatDate },
  { key: "removedAt", format: formatDate },
  { key: "emailSentAt", format: formatDate },
  { key: "smsSentAt", format: formatDate },
];

interface Props {
  isLoading: boolean;
  activeCampaigns: PlayerActiveCampaigns[];
}

export default ({ activeCampaigns = [], isLoading }: Props) => {
  const { query, setQuery, results } = useSearch<PlayerActiveCampaigns>(searchBy, activeCampaigns);
  const isEmpty = activeCampaigns.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Active Campaigns</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <DownloadCsvButton
            headers={CSV_HEADERS}
            data={results}
            disabled={isEmpty}
            keysToFormat={keysToFormat}
            fileName="active_campaigns.csv"
          />
        }
      />
      <Table initialData={activeCampaigns} isLoading={isLoading}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
