import React, { FC, useMemo } from "react";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import { ColumnProps } from "@idefix-backoffice/idefix/components";
import { BalanceCard } from "./BalanceCard";
import { RewardsTable } from "./RewardsTable";
import { useLedgersTabs } from "../hooks/useLedgersTabs";
import { getTableColumns } from "../utils";
import { InfoButton } from "./InfoButton";

const LedgersTabs: FC = () => {
  const {
    ledgers,
    isLedgersLoading,
    balance,
    isBalanceLoading,
    initGroups,
    selectedTab,
    handleChange,
    handleAddReward,
    handleMarkUsed
  } = useLedgersTabs();

  const columns = useMemo(() => {
    const dynamicColumns = initGroups ? getTableColumns(initGroups[selectedTab].table) : [];
    return [
      {
        label: "Info",
        name: "",
        align: "left",
        type: "custom",
        style: { maxWidth: 72 },
        format: (selectedTab: string, { events }: { events: string[] }) => <InfoButton eventLogs={events} />
      },
      ...dynamicColumns,
      {
        label: "Actions",
        name: "mark",
        align: "right",
        type: "custom",
        style: { maxWidth: 132 },
        format: (_: unknown, { groupId }: { groupId: string }) => (
          <Button color="primary" onClick={() => handleMarkUsed(groupId)} disabled={false}>
            Mark used
          </Button>
        )
      }
    ] as ColumnProps[];
  }, [handleMarkUsed, initGroups, selectedTab]);

  return (
    <div>
      <Tabs value={selectedTab} indicatorColor="primary" textColor="primary" onChange={handleChange}>
        {initGroups?.map(({ groupId, groupName }) => (
          <Tab key={groupId} label={groupName} />
        ))}
      </Tabs>
      {initGroups && initGroups[selectedTab].balanceGroup && (
        <BalanceCard balance={balance} isLoading={isBalanceLoading} />
      )}
      {initGroups?.map(
        ({ groupId, groupName }, idx) =>
          selectedTab === idx && (
            <RewardsTable
              key={groupId}
              ledgers={ledgers}
              groupName={groupName}
              isLoading={isLedgersLoading}
              columns={columns}
              onAddReward={handleAddReward}
            />
          )
      )}
    </div>
  );
};

export { LedgersTabs };
