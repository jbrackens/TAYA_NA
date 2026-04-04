import { FC } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";

import { EmptyPage } from "@idefix-backoffice/idefix/components";
import { UsersSidebar } from "../../modules/users-sidebar/UsersSidebar";

const UsersPage: FC = () => {
  const { pathname } = useLocation();
  const { userId } = useParams();
  const showOutlet = userId && pathname !== "/users";

  return (
    <Box display="flex">
      <Box width={308}>
        <UsersSidebar />
      </Box>
      <Divider orientation="vertical" sx={{ width: "1px", height: "auto" }} />
      <Box width="calc(100% - 308px)">
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

export { UsersPage };
