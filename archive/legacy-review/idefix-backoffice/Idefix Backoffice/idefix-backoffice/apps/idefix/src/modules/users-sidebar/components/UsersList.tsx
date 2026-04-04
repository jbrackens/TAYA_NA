import { FC } from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import LinearProgress from "@mui/material/LinearProgress";

import { User } from "@idefix-backoffice/idefix/types";

interface Props {
  users: User[];
  isLoading: boolean;
  onSelectUser: (userId: number) => () => void;
  userId: number;
}

const UsersList: FC<Props> = ({ users, isLoading, onSelectUser, userId }) => {
  return (
    <List disablePadding>
      {isLoading && <LinearProgress sx={{ position: "absolute", width: "100%" }} />}
      {users.map(user => (
        <ListItem key={user.id} disablePadding>
          <ListItemButton selected={user.id === userId} onClick={onSelectUser(user.id)}>
            <ListItemText primary={user.name} secondary={user.administratorAccess ? "Administrator" : null} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};

export { UsersList };
