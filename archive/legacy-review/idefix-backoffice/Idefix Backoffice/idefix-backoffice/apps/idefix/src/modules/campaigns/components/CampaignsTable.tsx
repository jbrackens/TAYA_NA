import Box from "@mui/material/Box";
import TrueIcon from "@mui/icons-material/RadioButtonChecked";
import FalseIcon from "@mui/icons-material/RadioButtonUnchecked";
import EmailIcon from "@mui/icons-material/Email";
import SmsIcon from "@mui/icons-material/Sms";
import Typography from "@mui/material/Typography";
import React, { ChangeEvent, useCallback } from "react";
import { isValid } from "date-fns";

import { formatDate } from "@idefix-backoffice/idefix/utils";
import {
  Column,
  ColumnProps,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { PlayerSentContent } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  {
    label: "Name",
    name: "name",
    align: "left",
    type: "custom",
    style: { minWidth: 92 },
    format: (value: string, item: any) => {
      const iconStyle = { marginRight: 5, height: 16 };
      return (
        <Box display="flex" alignItems="center">
          {item.type === "email" ? (
            <EmailIcon style={iconStyle} color="primary" />
          ) : (
            <SmsIcon style={iconStyle} color="primary" />
          )}
          <a
            href={item.previewUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            {value}
          </a>
        </Box>
      );
    }
  },
  {
    label: "Preview Url",
    name: "previewUrl",
    align: "left",
    type: "custom",
    style: { minWidth: 189 },
    format: (value: string) => (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
      >
        Open Preview
      </a>
    )
  },
  {
    label: "Send Time",
    name: "timestamp",
    align: "left",
    type: "date"
  },
  {
    label: "View",
    name: "viewedAt",
    align: "left",
    type: "custom",
    style: { minWidth: 162 },
    format: (value: string) =>
      value && isValid(new Date(value)) ? (
        <Box display="flex" alignItems="center">
          <TrueIcon style={{ marginRight: 5 }} /> {formatDate(value)}
        </Box>
      ) : (
        <FalseIcon />
      )
  },
  {
    label: "Click",
    name: "clickedAt",
    align: "right",
    type: "custom",
    style: { minWidth: 164 },
    format: (value: string) =>
      value && isValid(new Date(value)) ? (
        <Box display="flex" alignItems="center">
          <TrueIcon style={{ marginRight: 5 }} /> {formatDate(value)}
        </Box>
      ) : (
        <FalseIcon />
      )
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PlayerSentContent>(columns);

const keysToFormat = [
  { key: "timestamp", format: formatDate },
  { key: "clickedAt", format: formatDate }
];

interface Props {
  isLoading: boolean;
  campaigns: PlayerSentContent[] | undefined;
}

export default ({ campaigns = [], isLoading }: Props) => {
  const { query, setQuery, results } = useSearch<PlayerSentContent>(searchBy, campaigns);
  const isEmpty = campaigns.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Typography variant="subtitle2">Sent communications</Typography>
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
            fileName="sent_communications.csv"
          />
        }
      />
      <Table initialData={campaigns} isLoading={isLoading} estimatedItemSize={48} displayRows={12}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
