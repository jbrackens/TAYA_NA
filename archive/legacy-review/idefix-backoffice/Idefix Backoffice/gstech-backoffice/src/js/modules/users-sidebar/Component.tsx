import React, { ChangeEvent } from "react";
import Box from "@material-ui/core/Box";
import { User } from "app/types";
import { makeStyles } from "@material-ui/core/styles";
import Search from "./components/SearchField";
import UserList from "./components/UserList";
import Toolbar from "./components/Toolbar";
import Loading from "../../core/components/Loading";
import Divider from "@material-ui/core/Divider";

const useStyles = makeStyles(theme => ({
  sidebarScroll: {
    overflowY: "scroll",
  },
  sidebarLoading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
  },
}));

interface Props {
  users: User[];
  isFetching: boolean;
  filters: {
    inactive: boolean;
  };
  onSearch: (e: ChangeEvent<HTMLInputElement>) => void;
  onToggleFilter: (key: string, value: boolean) => void;
  onSelectUser: (id: number) => void;
}

export default ({ users, isFetching, filters, onSearch, onToggleFilter, onSelectUser }: Props) => {
  const classes = useStyles();

  return (
    <Box display="flex" flexDirection="column" height="100%" bgcolor="#FAFAFA">
      <Box>
        <Search onChange={onSearch} />
      </Box>

      <Divider light />

      {isFetching ? (
        <Loading size={60} thickness={7} className={classes.sidebarLoading} />
      ) : (
        <Box flexGrow={1} height="100%" className={classes.sidebarScroll}>
          <UserList users={users} onClick={onSelectUser} />
        </Box>
      )}

      <Divider light />
      <Toolbar filters={filters} onFilterToggle={onToggleFilter} />
    </Box>
  );
};
