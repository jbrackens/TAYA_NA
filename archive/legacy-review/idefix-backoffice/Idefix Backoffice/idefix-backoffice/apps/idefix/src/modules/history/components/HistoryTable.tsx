import { ChangeEvent, FC, useCallback } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import { ColumnProps, getSearchByKeys, Column, Search, Table } from "@idefix-backoffice/idefix/components";
import { EventType, PlayerEvent } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";
import { Filter } from "./Filter";
import { Actions } from "./Actions";

const columns = [
  {
    label: "Created",
    name: "createdAt",
    align: "left",
    type: "date",
    style: { maxWidth: 148 }
  },
  {
    label: "Handle",
    name: "handle",
    align: "left",
    type: "custom",
    format: (value: string) => (value ? `<${value}>` : "System"),
    style: { maxWidth: 192 }
  },
  {
    label: "Title",
    name: "title",
    align: "left",
    type: "text"
  },
  {
    label: "Type",
    name: "type",
    align: "right",
    type: "text",
    style: { maxWidth: 148 }
  }
] as ColumnProps[];

const searchBy = getSearchByKeys<any>(columns);

interface Props {
  events: PlayerEvent[];
  isLoading: boolean;
  onArchiveNote?: (id: number) => () => void;
  filters?: Record<EventType, boolean>;
  onFilterChange?: (filter: EventType) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  userId: number | undefined;
  playerId: number;
}

const HistoryTable: FC<Props> = ({ events, isLoading, onArchiveNote, filters, onFilterChange, userId, playerId }) => {
  const { query, setQuery, results } = useSearch<any>(searchBy, events);
  const isEmpty = events.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Typography variant="subtitle2">History and Notes</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={filters && onFilterChange && <Filter filters={filters} onFilterChange={onFilterChange} />}
      />
      <Table initialData={results} isLoading={isLoading} displayRows={24}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          style={{ maxWidth: 198 }}
          format={(_value: unknown, row: PlayerEvent) => (
            <Actions event={row} playerId={playerId} userId={userId} onArchiveNote={onArchiveNote} />
          )}
        />
      </Table>
    </Box>
  );
};

export { HistoryTable };
