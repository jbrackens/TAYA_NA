import { FC } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { Box, Divider } from "@mui/material";

import { EmptyPage } from "@idefix-backoffice/idefix/components";
import { PlayersSidebar } from "../../modules/players-sidebar";

const PlayersPage: FC = () => {
  const { pathname } = useLocation();
  const { playerId } = useParams();
  const showOutlet = playerId && pathname !== "/players";

  return (
    <Box display="flex">
      <Box>
        <PlayersSidebar />
      </Box>
      <Divider orientation="vertical" sx={{ width: "1px", height: "auto" }} />
      <Box width="calc(100% - 402px)">
        {showOutlet ? (
          <Outlet />
        ) : (
          <Box mt={3}>
            <EmptyPage />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export { PlayersPage };
