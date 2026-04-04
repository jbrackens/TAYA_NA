import { FC } from "react";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Checkbox from "@mui/material/Checkbox";

import { BrandSelector } from "@idefix-backoffice/idefix/components";

import { useSidebar } from "./hooks/useSidebar";
import { PlayersList } from "./components/PlayersList";
import { SearchField } from "./components/SearchField";
import { Tabs } from "./components/Tabs";
import { Tasks } from "./components/Tasks";

const PlayersSidebar: FC = () => {
  const { players, stickyPlayers, tab, brands, filters, selectedBrand, handleSelectBrand, handleToggleFilter } =
    useSidebar();

  return (
    <Box sx={{ borderRight: "1px solid rgba(0, 0, 0, 0.12)", height: "calc(100vh - 48px)", width: "400px" }}>
      <Box paddingTop={0}>
        <Tabs />
      </Box>
      <Box p={2}>{tab === "tasks" ? <Tasks /> : <SearchField />}</Box>
      <Box
        sx={{
          overflow: "scroll",
          borderTop: "1px solid rgba(0, 0, 0, 0.12)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
          height: "calc(100% - 216px)"
        }}
      >
        <PlayersList players={players} stickyPlayers={stickyPlayers} tab={tab} />
      </Box>
      <Box display="flex" alignItems="center" p={2}>
        <BrandSelector brands={brands || []} onChange={handleSelectBrand} selectedBrand={selectedBrand} />
        <Box ml={2}>
          <Tooltip title="Show closed accounts">
            <Checkbox size="medium" checked={filters.closed} onChange={handleToggleFilter} />
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export { PlayersSidebar };
