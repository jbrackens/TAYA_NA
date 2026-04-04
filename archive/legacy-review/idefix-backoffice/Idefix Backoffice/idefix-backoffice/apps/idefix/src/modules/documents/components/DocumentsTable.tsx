import React, { ChangeEvent, FC, useCallback } from "react";
import capitalize from "lodash/fp/capitalize";
import lowerCase from "lodash/fp/lowerCase";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import {
  ColumnProps,
  getCsvHeaders,
  getSearchByKeys,
  DownloadCsvButton,
  Column,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { Kyc } from "@idefix-backoffice/idefix/types";
import { formatDate } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  {
    label: "Type",
    name: "documentType",
    align: "left",
    type: "custom",
    format: (value: string) => capitalize(lowerCase(value))
  },
  {
    label: "Account",
    name: "account",
    align: "left",
    type: "custom",
    format: (value: string, { type }: Kyc) => (value ? `${type} ${value}` : " ")
  },
  {
    label: "Created",
    name: "createdAt",
    align: "left",
    type: "date"
  },
  {
    label: "Expires",
    name: "expiryDate",
    align: "left",
    type: "date"
  },
  { label: "Status", name: "status", align: "left", type: "custom", format: capitalize }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [
  { key: "createdAt", format: formatDate },
  { key: "expiryDate", format: formatDate }
];

interface Props {
  documents: Kyc[];
  isLoading: boolean;
  onEditDocument: (document: Kyc) => void;
}

const DocumentsTable: FC<Props> = ({ documents, isLoading, onEditDocument }) => {
  const { query, setQuery, results } = useSearch<any>(searchBy, documents);
  const isEmpty = documents.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Typography variant="subtitle2">Documents</Typography>
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
            fileName="documents.csv"
          />
        }
      />
      <Table initialData={results} isLoading={isLoading}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(_value: unknown, document: Kyc) => (
            <Button color="primary" onClick={() => onEditDocument(document)}>
              Edit
            </Button>
          )}
        />
      </Table>
    </Box>
  );
};

export { DocumentsTable };
