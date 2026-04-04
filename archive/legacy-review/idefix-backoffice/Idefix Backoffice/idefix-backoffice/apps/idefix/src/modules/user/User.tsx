import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { FC } from "react";
import { AccessSettings } from "./components/AccessSettings";
import { CreateUserFab } from "./components/CreateUserFab";
import { UserDetails } from "./components/UserDetails";
import { UserLogs } from "./components/UserLogs";
import { useUser } from "./hooks";

const User: FC = () => {
  const {
    user,
    isLoadingUser,
    accessSettings,
    isLoadingAccessSettings,
    log,
    isLoadingLogs,
    handleCreateUser,
    handleUpdateUser,
    handleUpdateAccessSettings
  } = useUser();

  return (
    <Box p={3}>
      <Box>
        <UserDetails isLoading={isLoadingUser} user={user} onSubmit={handleUpdateUser} />
      </Box>

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box mt={3}>
        <AccessSettings
          accessSettings={accessSettings}
          isLoading={isLoadingAccessSettings}
          onUpdate={handleUpdateAccessSettings}
        />
      </Box>

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box mt={3}>
        <UserLogs isLoading={isLoadingLogs} log={log} />
      </Box>
      <Box position="fixed" bottom={16} right={16}>
        <CreateUserFab onCreateUser={handleCreateUser} />
      </Box>
    </Box>
  );
};

export { User };
