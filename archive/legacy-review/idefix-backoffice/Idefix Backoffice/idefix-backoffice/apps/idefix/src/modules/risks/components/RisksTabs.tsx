import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { makeStyles } from "@mui/styles";

import { RiskLog, RiskStatus, RiskType } from "@idefix-backoffice/idefix/types";

import { ContributionTable } from "./ContributionTable";
import { EventHistoryTable } from "./EventHistoryTable";
import { TabPanel } from "./TabPanel";

const useStyles = makeStyles({
  root: {
    flexGrow: 1
  },
  indicator: {
    height: 1
  },
  tabPanelWrapper: {
    display: "flex",
    flexDirection: "column",
    marginTop: 24,
    "& > :not(:first-child)": {
      marginTop: "24px"
    }
  }
});

interface Props {
  playerId: number;
  riskType: RiskType | undefined;
  risksByType: RiskStatus[];
  risksTabs: [string, unknown][];
  logs: RiskLog[];
  isLoadingRisksByType: boolean;
  isLoadingLogs: boolean;
  onChangeType: (type: RiskType) => void;
}

const RisksTabs = ({
  playerId,
  riskType,
  risksByType,
  risksTabs,
  logs,
  isLoadingRisksByType,
  isLoadingLogs,
  onChangeType
}: Props) => {
  const classes = useStyles();
  const [value, setValue] = useState(0);
  const defaultIndex = risksTabs.findIndex(([value]) => value === riskType);

  const handleChange = useCallback(
    (_event: any, newValue: number) => {
      setValue(newValue);
      const [key] = risksTabs[newValue];
      onChangeType(key as RiskType);
    },
    [onChangeType, risksTabs]
  );

  useLayoutEffect(() => {
    if (defaultIndex !== -1) {
      setValue(defaultIndex);
    }
  }, [defaultIndex]);

  const tables = useMemo(
    () => (
      <>
        <ContributionTable risksByType={risksByType} isLoading={isLoadingRisksByType} />
        <EventHistoryTable playerId={playerId} logs={logs} isLoading={isLoadingLogs} />
      </>
    ),
    [isLoadingLogs, isLoadingRisksByType, logs, playerId, risksByType]
  );

  return (
    <div className={classes.root}>
      <Tabs
        value={value}
        onChange={handleChange}
        classes={{ indicator: classes.indicator }}
        indicatorColor="primary"
        textColor="primary"
        aria-label="simple tabs example"
      >
        {risksTabs && risksTabs.map(([key, value]) => <Tab key={key} label={`${key} RISK ${value}%`} />)}
      </Tabs>
      <TabPanel value={value} index={0}>
        <Box className={classes.tabPanelWrapper}>{tables}</Box>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Box className={classes.tabPanelWrapper}>{tables}</Box>
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Box className={classes.tabPanelWrapper}>{tables}</Box>
      </TabPanel>
      <TabPanel value={value} index={3}>
        <Box className={classes.tabPanelWrapper}>{tables}</Box>
      </TabPanel>
    </div>
  );
};

export { RisksTabs };
