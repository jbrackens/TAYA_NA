import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector, appSlice, sidebarSlice, playersSlice } from "@idefix-backoffice/idefix/store";

export const useTasks = () => {
  const dispatch = useAppDispatch();
  const tasksList = useAppSelector(appSlice.getTasksList);
  const tasks = useAppSelector(sidebarSlice.getTasks);
  const brandId = useAppSelector(sidebarSlice.getSelectedBrand);
  const query = useAppSelector(sidebarSlice.getSearchQuery);
  const calculatedTasks = sidebarSlice.calculateTasksValues(tasks, tasksList);

  const [value, setValue] = useState("all");

  const handleChange = useCallback(
    (newValue: string) => () => {
      setValue(newValue);
      dispatch(
        playersSlice.searchPlayers({
          tab: "tasks",
          query: { text: query, brandId, filters: {} },
          taskType: newValue === "all" ? undefined : newValue
        })
      );
    },
    [brandId, dispatch, query]
  );

  return { tasksList, calculatedTasks, value, handleChange };
};
