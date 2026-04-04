import { SyntheticEvent, useCallback, useState, useEffect } from "react";
import { EmotionJSX } from "@emotion/react/types/jsx-namespace";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import TaskOutlinedIcon from "@mui/icons-material/TaskOutlined";
import FaceOutlinedIcon from "@mui/icons-material/FaceOutlined";

import { playersSlice, sidebarSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";
import { useWebSocket } from "@idefix-backoffice/shared/hooks";

type Tab = {
  label: "All" | "Docs" | "WD" | "Tasks" | "Online";
  name: "all" | "docs" | "withdrawals" | "tasks" | "online";
  icon: EmotionJSX.Element;
};

const tabs: Tab[] = [
  { label: "All", name: "all", icon: <GroupsOutlinedIcon /> },
  { label: "Docs", name: "docs", icon: <PendingActionsOutlinedIcon /> },
  { label: "WD", name: "withdrawals", icon: <CreditCardOutlinedIcon /> },
  { label: "Tasks", name: "tasks", icon: <TaskOutlinedIcon /> },
  { label: "Online", name: "online", icon: <FaceOutlinedIcon /> }
];

export const useTabs = () => {
  const socket = useWebSocket();
  const dispatch = useAppDispatch();
  const brandId = useAppSelector(sidebarSlice.getSelectedBrand);
  const searchQuery = useAppSelector(sidebarSlice.getSearchQuery);
  const filters = useAppSelector(sidebarSlice.getFilters);
  const badgeValues = useAppSelector(sidebarSlice.getCalculatedBadgeValues);
  const tab = useAppSelector(sidebarSlice.getTab);
  const [value, setValue] = useState(tab || tabs[0].name);

  const handleChange = useCallback(
    (event: SyntheticEvent<Element, Event>, newValue: string) => {
      setValue(newValue);
      dispatch(sidebarSlice.changeTab(newValue));
      dispatch(playersSlice.searchPlayers({ tab: newValue, query: { text: searchQuery, brandId, filters } }));
    },
    [brandId, dispatch, filters, searchQuery]
  );

  const handleUpdateSidebarStatus = useCallback(
    (data: unknown) => {
      dispatch(sidebarSlice.updateSidebarStatus(data));
    },
    [dispatch]
  );

  useEffect(() => {
    socket.on("ws/sidebar-status", handleUpdateSidebarStatus);
    socket.emit("ws/sidebar-status-listening");

    return () => {
      socket.off("ws/sidebar-status", handleUpdateSidebarStatus);
    };
  }, [handleUpdateSidebarStatus, socket]);

  return { value, handleChange, tabs, badgeValues };
};
