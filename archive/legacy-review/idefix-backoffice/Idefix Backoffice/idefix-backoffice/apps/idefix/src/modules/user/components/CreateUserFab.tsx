import { FC } from "react";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
import Tooltip from "@mui/material/Tooltip";

interface Props {
  onCreateUser: () => void;
}

const CreateUserFab: FC<Props> = ({ onCreateUser }) => {
  return (
    <Tooltip title="Create user">
      <Fab onClick={onCreateUser} color="primary">
        <AddIcon />
      </Fab>
    </Tooltip>
  );
};

export { CreateUserFab };
