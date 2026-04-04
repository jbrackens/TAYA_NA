import React, { FC, useCallback, useState } from "react";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { User } from "app/types";

interface Props {
  users: User[];
  onClick: (id: number) => void;
}

const UserList: FC<Props> = ({ users, onClick }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleListItemClick = useCallback((index: number) => setSelectedIndex(index), []);

  return (
    <List>
      {users.map((user, index) => (
        <ListItem
          button
          key={user.id}
          selected={selectedIndex === index}
          onClick={() => {
            onClick(user.id);
            handleListItemClick(index);
          }}
        >
          <ListItemText primary={user.name} secondary={user.administratorAccess ? "Administrator" : null} />
        </ListItem>
      ))}
    </List>
  );
};

export default UserList;
