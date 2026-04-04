import { FC } from "react";
import Box from "@mui/material/Box";
import { useUsersSidebar } from "./hooks";
import { Search } from "./components/Search";
import { UsersList } from "./components/UsersList";
import { Filter } from "./components/Filter";

const UsersSidebar: FC = () => {
  const { users, isLoading, handleChangeQuery, handleSelectUser, handleToggleFilter, userId, filters } =
    useUsersSidebar();

  return (
    <Box sx={{ borderRight: "1px solid rgba(0, 0, 0, 0.12)", height: "calc(100vh - 48px)", width: "308px" }}>
      <Box p={2}>
        <Search onChange={handleChangeQuery} />
      </Box>
      <Box
        sx={{
          overflow: "scroll",
          borderTop: "1px solid rgba(0, 0, 0, 0.12)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
          height: "calc(100% - 137px)"
        }}
      >
        <UsersList users={users} isLoading={isLoading} onSelectUser={handleSelectUser} userId={userId} />
      </Box>
      <Box p={2}>
        <Filter filters={filters} onToggleFilter={handleToggleFilter} />
      </Box>
    </Box>
  );
};

export { UsersSidebar };
