import React from "react";
import Box from "@material-ui/core/Box";
import Events from "./components/Events";
import DropdownFilter from "../../core/components/dropdown-filter";
import { EventType, PlayerEvent } from "app/types";
import { Typography } from "@material-ui/core";

interface Props {
  playerId: number;
  userId: number;
  filters: Record<EventType, boolean>;
  filtersList: string[];
  events: PlayerEvent[];
  onFilterCheck: (filter: EventType) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onArchiveNote: (noteId: number) => void;
}

export default ({ filters, filtersList, events, userId, onFilterCheck, onArchiveNote, playerId }: Props) => (
  <Box p={3}>
    <Box display="flex" justifyContent="space-between">
      <Typography variant="subtitle2">History and notes</Typography>
      <DropdownFilter list={filtersList} filters={filters} onFilterCheck={onFilterCheck} />
    </Box>
    <Box mt={2} paddingBottom={12}>
      <Box>
        <Events events={events} userId={userId} playerId={playerId} onArchiveNote={onArchiveNote} />
      </Box>
    </Box>
  </Box>
);
