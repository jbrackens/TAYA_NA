import { FC } from "react";
import Badge from "@mui/material/Badge";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";

import { useTabs } from "../hooks/useTabs";

const Tabs: FC = () => {
  const { value, handleChange, tabs, badgeValues } = useTabs();

  return (
    <BottomNavigation showLabels value={value} onChange={handleChange}>
      {tabs.map(({ label, name, icon }) => (
        <BottomNavigationAction
          key={name}
          label={label}
          value={name}
          icon={
            <Badge badgeContent={(badgeValues && name !== "all" && badgeValues[name]) || 0} max={10000}>
              {icon}
            </Badge>
          }
        />
      ))}
    </BottomNavigation>
  );
};

export { Tabs };
