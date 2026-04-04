import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import PendingTasksMenu from "./PendingTasksMenu";
import { PlayerStatus, PlayerWithUpdate } from "app/types";

const useStyles = makeStyles(theme => ({
  tabs: {
    minHeight: 40,
    height: 40,
  },
  buttonRoot: {
    minWidth: 0,
    minHeight: 40,
    padding: "12px 16px",
  },
  text: {
    display: "inline",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
  },
  disabled: {
    "& span": {
      color: theme.colors.blackMiddle,
    },
  },
  selected: {
    "& span": {
      color: theme.colors.blue,
    },
  },
  indicator: {
    height: 1,
    backgroundColor: theme.colors.blue,
  },
}));

const tabs = [
  { label: "Player Info", tab: "player-info" },
  { label: "Documents", tab: "documents" },
  { label: "Bonuses", tab: "bonuses" },
  { label: "History", tab: "history-and-notes" },
  { label: "Transactions", tab: "transactions" },
  { label: "Payments", tab: "payments" },
  { label: "Limits", tab: "limits" },
  { label: "Risks", tab: "risks/customer" },
  { label: "Promotions", tab: "promotions" },
  { label: "Rewards", tab: "rewards" },
  { label: "Campaigns", tab: "campaigns" },
];

interface Props {
  tabValue: number;
  kycDocuments: PlayerWithUpdate["kycDocuments"];
  withdrawals: PlayerWithUpdate["withdrawals"];
  fraudIds: PlayerWithUpdate["fraudIds"];
  balance?: PlayerStatus["balance"];
  onTaskClick: (taskType: string) => void;
  onChangeTab: (tab: string) => void;
  onChangeTabValue: (_e: any, newValue: number) => void;
}

export default (props: Props) => {
  const { tabValue, kycDocuments, withdrawals, fraudIds, onTaskClick, onChangeTab, onChangeTabValue, balance } = props;
  const classes = useStyles();
  const styles = {
    root: classes.buttonRoot,
    selected: classes.selected,
    wrapper: classes.text,
    disabled: classes.disabled,
  };

  return (
    <Tabs
      value={tabValue}
      onChange={onChangeTabValue}
      indicatorColor="primary"
      variant="scrollable"
      scrollButtons="auto"
      aria-label="scrollable auto tabs"
      classes={{ indicator: classes.indicator, root: classes.tabs }}
    >
      <PendingTasksMenu
        kycDocuments={kycDocuments}
        withdrawals={withdrawals}
        fraudIds={fraudIds}
        balance={balance}
        onTaskClick={onTaskClick}
        classes={styles}
      />
      {tabs.map(({ label, tab }) => {
        return <Tab key={tab} onClick={() => onChangeTab(tab)} label={label} classes={styles} />;
      })}
    </Tabs>
  );
};
