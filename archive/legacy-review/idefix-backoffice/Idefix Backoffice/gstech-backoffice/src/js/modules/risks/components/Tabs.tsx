import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import TabPanel from "./TabPanel";
import ContributionTable from "./ContributionTable";
import EventHistoryTable from "./EventHistoryTable";
import { RiskLog, RiskStatus, RiskType } from "app/types";

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  indicator: {
    height: 1,
    backgroundColor: theme.colors.black,
  },
  tabPanelWrapper: {
    display: "flex",
    flexDirection: "column",
    marginTop: 24,
    "& > :not(:first-child)": {
      marginTop: "24px",
    },
  },
}));

interface Props {
  risksByType: RiskStatus[];
  risksTabs: [string, number][];
  logs: RiskLog[];
  isRisksByTypeLoading: boolean;
  isLogsLoading: boolean;
  onChangeType: (type: RiskType) => void;
}

const RisksTabs = ({ risksByType, risksTabs, logs, isRisksByTypeLoading, isLogsLoading, onChangeType }: Props) => {
  const classes = useStyles();
  const params = useParams();
  const riskType = params.riskType as RiskType;
  const defaultIndex = risksTabs.findIndex(([value]) => value === riskType);
  const [value, setValue] = useState(0);

  const handleChange = useCallback(
    (_event, newValue: number) => {
      setValue(newValue);
      const [key] = risksTabs[newValue];
      onChangeType(key as RiskType);
    },
    [onChangeType, risksTabs],
  );

  useEffect(() => {
    if (defaultIndex !== -1) {
      setValue(defaultIndex);
    }
  }, [defaultIndex]);

  const tables = useMemo(
    () => (
      <>
        <ContributionTable risksByType={risksByType} isLoading={isRisksByTypeLoading} />
        <EventHistoryTable logs={logs} isLoading={isLogsLoading} />
      </>
    ),
    [isLogsLoading, isRisksByTypeLoading, logs, risksByType],
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

export default RisksTabs;
