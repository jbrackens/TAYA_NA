import React, { memo, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import BottomNavigation from "@material-ui/core/BottomNavigation";
import BottomNavigationAction from "@material-ui/core/BottomNavigationAction";
import Badge from "@material-ui/core/Badge";
import Box from "@material-ui/core/Box";
import DocsIcon from "@material-ui/icons/Attachment";
import OnlineIcon from "@material-ui/icons/Face";
import AllIcon from "./AllIcon";
import WDIcon from "./WdIcon";
import TaskIcon from "./TaskIcon";

const useStyles = makeStyles(theme => ({
  bottomNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: "100%",
    backgroundColor: "inherit",
  },
  bottomNavAction: {
    maxWidth: "48px",
    height: "48px",
    minWidth: 0,
    padding: 0,
    paddingTop: 0,
    color: "#bdbdbd",
    borderRadius: "8px",

    "&:hover": {
      background: theme.colors.blue50,
      borderRadius: "8px",
    },
  },
  bottomNavActionSelected: {
    padding: "0!important",
    transition: "none!important",
    transform: "none!important",
    fontSize: "0.75rem!important",
  },
}));

const filters = [
  { label: "All", name: "all", icon: <AllIcon /> },
  { label: "Docs", name: "docs", icon: <DocsIcon /> },
  { label: "WD", name: "withdrawals", icon: <WDIcon /> },
  { label: "Tasks", name: "tasks", icon: <TaskIcon /> },
  { label: "Online", name: "online", icon: <OnlineIcon /> },
];

const FilterList = ({ badgeValues, onChangeFilter }: { badgeValues: any; onChangeFilter: (name: string) => void }) => {
  const [value, setValue] = useState(0);
  const classes = useStyles();

  return (
    <Box mt="12px" padding="0 12px">
      <BottomNavigation
        value={value}
        classes={{ root: classes.bottomNav }}
        showLabels
        onChange={(event, newValue) => {
          setValue(newValue);
        }}
      >
        {filters.map(({ label, name, icon }) => (
          <BottomNavigationAction
            key={name}
            classes={{ root: classes.bottomNavAction, selected: classes.bottomNavActionSelected }}
            label={label}
            icon={
              <Badge
                variant="standard"
                color="primary"
                badgeContent={(badgeValues && badgeValues[name]) || 0}
                max={10000}
              >
                {icon}
              </Badge>
            }
            onClick={() => onChangeFilter(name)}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
};

export default memo(FilterList);
