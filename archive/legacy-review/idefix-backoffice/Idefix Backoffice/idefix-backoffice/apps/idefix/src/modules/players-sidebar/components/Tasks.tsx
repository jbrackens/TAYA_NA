import { FC } from "react";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import Typography from "@mui/material/Typography";

import { useTasks } from "../hooks/useTasks";

interface TaskProps {
  title: string;
  id: string;
  selected: boolean;
  badgeCount: number;
  onChange: (newValue: string) => () => void;
}

const Task: FC<TaskProps> = ({ title, id, selected, badgeCount, onChange }) => {
  return (
    <Badge badgeContent={badgeCount} color={selected ? "info" : "default"}>
      <Typography
        sx={{ cursor: "pointer" }}
        color={selected ? "primary" : "default"}
        onClick={selected ? undefined : onChange(id)}
      >
        {title}
      </Typography>
    </Badge>
  );
};

const Tasks: FC = () => {
  const { tasksList, calculatedTasks, value, handleChange } = useTasks();

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" height="40px">
      <Task id="all" title="All" selected={value === "all"} badgeCount={0} onChange={handleChange} />
      {tasksList?.map(({ title, id }) =>
        calculatedTasks[id] ? (
          <Task
            key={id}
            id={id}
            title={title}
            selected={value === id}
            badgeCount={calculatedTasks[id] || 0}
            onChange={handleChange}
          />
        ) : null
      )}
    </Stack>
  );
};

export { Tasks };
