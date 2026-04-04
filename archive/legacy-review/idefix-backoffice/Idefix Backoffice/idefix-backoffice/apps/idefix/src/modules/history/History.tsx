import { FC } from "react";
import Box from "@mui/material/Box";

import { useHistory } from "./hooks";
import { HistoryTable } from "./components/HistoryTable";

const History: FC = () => {
  const { events, isLoadingEvents, handleArchiveNote, userId, playerId, filters, handleFilterChange } = useHistory();
  return (
    <Box>
      <Box>
        <HistoryTable
          events={events}
          isLoading={isLoadingEvents}
          onArchiveNote={handleArchiveNote}
          filters={filters}
          onFilterChange={handleFilterChange}
          userId={userId}
          playerId={playerId}
        />
      </Box>
    </Box>
  );
};

export { History };
