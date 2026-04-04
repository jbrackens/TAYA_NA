import React, { ChangeEvent, FC, useCallback } from "react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import { makeStyles } from "@mui/styles";
import Typography from "@mui/material/Typography";

import {
  Column,
  ColumnProps,
  DownloadAllCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const useStyles = makeStyles({
  openIcon: {
    cursor: "pointer"
  }
});

const columns = [
  { label: "Event", name: "event", align: "left", type: "text", style: { maxWidth: 132 } },
  {
    label: "Comment",
    name: "comment",
    align: "right",
    type: "text"
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<string>(columns);

interface Props {
  eventLogs: string[];
}

const InfoButton: FC<Props> = ({ eventLogs }) => {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState<Element | null>(null);
  const { query, setQuery, results } = useSearch<string>(searchBy, eventLogs);
  const isEmpty = eventLogs.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  const handleClick = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <InfoIcon onClick={handleClick} className={classes.openIcon} />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
      >
        <Box display="flex" flexDirection="column" flexGrow={1} minWidth="648px" p={3}>
          <Typography variant="subtitle2">Events</Typography>
          <Search
            value={query}
            onChange={handleSearchQuery}
            placeholder="Search"
            disabled={isEmpty}
            buttons={
              <DownloadAllCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="events.csv" />
            }
          />
          <Table initialData={results} isLoading={false} displayRows={6}>
            {columns.map(column => (
              <Column key={column.name} {...column} />
            ))}
          </Table>
        </Box>
      </Popover>
    </>
  );
};

export { InfoButton };
