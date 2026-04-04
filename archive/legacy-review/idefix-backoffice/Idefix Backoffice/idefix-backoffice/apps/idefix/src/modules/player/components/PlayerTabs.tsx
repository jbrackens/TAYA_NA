import { FC, SyntheticEvent, useCallback, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";

import { useAppDispatch, sidebarSlice } from "@idefix-backoffice/idefix/store";
import { PlayerWithUpdate } from "@idefix-backoffice/idefix/types";

import { TasksTab } from "./TasksTab";
import { TABS } from "../constants";

const tabsKeys = ["tasks", ...TABS.map(({ tab }) => tab)];

interface Props {
  kycDocuments: PlayerWithUpdate["kycDocuments"];
  withdrawals: PlayerWithUpdate["withdrawals"];
  fraudIds: PlayerWithUpdate["fraudIds"];
}

const PlayerTabs: FC<Props> = ({ kycDocuments, withdrawals, fraudIds }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);
  const currentTab = pathname.split("/")[3];
  const [value, setValue] = useState(1);

  const handleChange = useCallback(
    (_event: SyntheticEvent, newValue: number) => {
      const tab = tabsKeys[newValue];
      setValue(newValue);
      dispatch(sidebarSlice.changePlayerTab(playerId, tab));
      navigate(tab);
    },
    [dispatch, navigate, playerId]
  );

  useLayoutEffect(() => {
    const defaultTab = tabsKeys.indexOf(currentTab);

    if (currentTab !== null && currentTab !== "risks") {
      setValue(defaultTab);
    }

    if (currentTab === "risks") {
      setValue(8);
    }
  }, [currentTab]);

  return (
    <Box>
      <Tabs value={value} onChange={handleChange} variant="scrollable" scrollButtons="auto">
        <TasksTab kycDocuments={kycDocuments} withdrawals={withdrawals} fraudIds={fraudIds} />
        {TABS.map(({ label, tab }) => (
          <Tab key={tab} label={label} />
        ))}
      </Tabs>
    </Box>
  );
};

export { PlayerTabs };
