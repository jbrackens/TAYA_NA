import React, { memo, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import cn from "classnames";
import { getTasksList } from "../../../app";
import { calculateTasksValues } from "../../utils";
import Badge from "@material-ui/core/Badge";

const useStyles = makeStyles(theme => ({
  box: {
    height: "85.63px",
  },
  tab: {
    fontWeight: "normal",
    fontSize: "14px",
    whiteSpace: "nowrap",
    lineHeight: "16px",
    color: theme.colors.blackDark,
    "&:not(:first-child)": {
      marginLeft: "16px",
    },
    cursor: "pointer",
  },
  badge: {
    " & > .MuiBadge-badge": {
      backgroundColor: theme.colors.blue50,
      color: theme.colors.blue,
    },
    "& > .MuiTypography-root": {
      zIndex: 2,
      marginLeft: "16px",
    },
  },
  selected: {
    color: theme.colors.blue,
  },
}));

interface Props {
  tasks: any;
  onChangeTaskFilter: (tab: string) => void;
}

const TaskFilter = ({ onChangeTaskFilter, tasks }: Props) => {
  const [selected, setSelected] = useState("all");
  const classes = useStyles();
  const tasksList = useSelector(getTasksList);
  const calculatedCount = calculateTasksValues(tasks, tasksList);

  const handleChange = useCallback(
    (tab: string) => {
      setSelected(tab);
      onChangeTaskFilter(tab);
    },
    [onChangeTaskFilter],
  );

  return (
    <Box className={classes.box} display="flex" alignItems="center" justifyContent="space-around" p={2}>
      <Typography
        className={cn(classes.tab, {
          [classes.selected]: selected === "all",
        })}
        onClick={() => handleChange("all")}
      >
        All
      </Typography>
      {tasksList?.map(({ id, title }) =>
        calculatedCount[id] ? (
          <Badge className={classes.badge} badgeContent={calculatedCount[id] || 0} max={10000}>
            <Typography
              key={id}
              className={cn(classes.tab, {
                [classes.selected]: selected === id ? true : false,
              })}
              onClick={() => handleChange(id)}
            >
              {title}
            </Typography>
          </Badge>
        ) : null,
      )}
    </Box>
  );
};

export default memo(TaskFilter);
