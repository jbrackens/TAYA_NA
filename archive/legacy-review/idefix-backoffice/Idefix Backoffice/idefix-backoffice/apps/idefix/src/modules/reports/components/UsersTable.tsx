import React, { ChangeEvent, FC, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import {
  ColumnProps,
  getCsvHeaders,
  getSearchByKeys,
  DownloadCsvButton,
  Column,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { formatDate } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Handle", name: "handle", align: "left", type: "text" },
  { label: "Name", name: "name", align: "left", type: "text" },
  { label: "E-mail", name: "email", align: "left", type: "text" },
  { label: "Phone", name: "mobilePhone", align: "left", type: "text" },
  {
    label: "Last seen",
    name: "lastSeen",
    align: "left",
    type: "date"
  },
  {
    label: "Last PW reset",
    name: "lastPasswordReset",
    align: "left",
    type: "date"
  },
  {
    label: "Password Expires",
    name: "passwordExpires",
    align: "left",
    type: "date"
  },
  {
    label: "Active",
    name: "accountClosed",
    align: "left",
    type: "boolean",
    style: { maxWidth: 64 }
  },
  {
    label: "Admin",
    name: "administratorAccess",
    align: "left",
    type: "boolean",
    style: { maxWidth: 64 }
  },
  {
    label: "Payments",
    name: "paymentAccess",
    align: "left",
    type: "boolean",
    style: { maxWidth: 64 }
  },
  {
    label: "Reports",
    name: "reportingAccess",
    align: "left",
    type: "boolean",
    style: { maxWidth: 64 }
  },
  {
    label: "Risk",
    name: "riskManager",
    align: "right",
    type: "boolean",
    style: { maxWidth: 64 }
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [
  {
    key: "lastSeen",
    format: formatDate
  },
  {
    key: "lastPasswordReset",
    format: formatDate
  },
  {
    key: "passwordExpires",
    format: formatDate
  }
];

interface Props {
  items: any[];
  isLoading: boolean;
}

const UsersTable: FC<Props> = ({ items, isLoading }) => {
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
      <Typography variant="subtitle2">Users</Typography>
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
            fileName="users.csv"
          />
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

export { UsersTable };
