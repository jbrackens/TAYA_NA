import React, { ChangeEvent, useCallback } from "react";
import Box from "@material-ui/core/Box";
import Popover from "@material-ui/core/Popover";
import InfoIcon from "@material-ui/icons/InfoOutlined";
import { makeStyles } from "@material-ui/styles";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import Search from "../../../core/components/search";
import { DownloadAllCsvButton } from "../../../core/components/button";
import useSearch from "../../../core/hooks/useSearch";

const useStyles = makeStyles({
  openIcon: {
    cursor: "pointer",
  },
});

const columns = [
  { label: "Event", name: "event", align: "left", type: "text", style: { maxWidth: 132 } },
  {
    label: "Comment",
    name: "comment",
    align: "right",
    type: "text",
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<string>(columns);

const InfoButton = ({ eventLogs }: { eventLogs: string[] }) => {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState<Element | null>(null);
  const { query, setQuery, results } = useSearch<string>(searchBy, eventLogs);
  const isEmpty = eventLogs.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
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
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
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

export default InfoButton;
