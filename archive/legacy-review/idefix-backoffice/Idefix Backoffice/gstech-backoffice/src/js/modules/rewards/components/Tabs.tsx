import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { fetchPlayerLedgers, getBalance, getIsBalanceLoading, getIsLedgersLoading, getLedgers } from "../rewardsSlice";
import RewardsTable from "./RewardsTable";
import InfoButton from "./InfoButton";
import { openDialog } from "../../../dialogs";
import { getTableColumns } from "../utils";
import BalanceCard from "./BalanceCard";
import { RewardGroup } from "app/types";
import { AppDispatch } from "index";
import { ColumnProps } from "../../../core/components/table";
import Button from "@material-ui/core/Button";
import isEmpty from "lodash/fp/isEmpty";

const LedgersTabs = ({ brandId, initGroups }: { brandId: string; initGroups?: RewardGroup[] | null }) => {
  const dispatch: AppDispatch = useDispatch();
  const params = useParams();
  const playerId = Number(params.playerId);
  const groupId = params.groupId!;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const ledgers = useSelector(getLedgers);
  const isLedgersLoading = useSelector(getIsLedgersLoading);
  const balance = useSelector(getBalance);
  const isBalanceLoading = useSelector(getIsBalanceLoading);
  const defaultIndex = initGroups?.findIndex(group => group.groupId === groupId);
  const [selectedTab, setSelectedValue] = useState(0);

  const handleChange = useCallback(
    (event, newValue) => {
      setSelectedValue(newValue);
      const { groupId } = initGroups![newValue];
      const newPath = `${pathname.substring(0, pathname.lastIndexOf("rewards"))}rewards/${groupId}`;
      navigate(newPath);
    },
    [initGroups, pathname, navigate],
  );

  const handleAddReward = useCallback(() => {
    dispatch(openDialog("add-reward", { playerId, brandId, groupId, groupName: initGroups![selectedTab].groupName }));
  }, [dispatch, playerId, brandId, groupId, initGroups, selectedTab]);

  const handleMarkUsed = useCallback(
    groupId => dispatch(openDialog("confirm-mark-as-used", { playerId, groupId })),
    [dispatch, playerId],
  );

  const handleFetchLedgers = useCallback(
    (pageSize?: number) => {
      if (pageSize && pageSize < 105) return; // to prevent second api call if there is little data
      dispatch(fetchPlayerLedgers({ playerId, params: { pageSize, group: groupId, brandId } }));
    },
    [brandId, dispatch, groupId, playerId],
  );

  useEffect(() => {
    if (brandId && groupId) {
      dispatch(fetchPlayerLedgers({ playerId, params: { group: groupId, brandId } }));
    }
  }, [brandId, dispatch, groupId, playerId]);

  useEffect(() => {
    if (defaultIndex !== -1 && defaultIndex !== undefined) {
      setSelectedValue(defaultIndex);
    }

    if (initGroups && !groupId) {
      const { groupId } = initGroups[0];
      const newPath = `${pathname.substring(0, pathname.lastIndexOf("rewards"))}rewards/${groupId}`;
      setSelectedValue(0);
      navigate(newPath);
    }
  }, [defaultIndex, groupId, initGroups, pathname, navigate]);

  const columns = useMemo(() => {
    const dynamicColumns = initGroups ? getTableColumns(initGroups[selectedTab].table) : [];
    return [
      {
        label: "Info",
        name: "",
        align: "left",
        type: "custom",
        style: { maxWidth: 72 },
        format: (selectedTab: string, { events }: { events: string[] }) => <InfoButton eventLogs={events} />,
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
        ),
      },
    ] as ColumnProps[];
  }, [handleMarkUsed, initGroups, selectedTab]);

  return (
    <div>
      <Tabs value={selectedTab} indicatorColor="primary" textColor="primary" onChange={handleChange}>
        {initGroups?.map(({ groupId, groupName }) => (
          <Tab key={groupId} label={groupName} />
        ))}
      </Tabs>
      {initGroups && initGroups[selectedTab].balanceGroup && !isEmpty(balance) && (
        <BalanceCard balance={balance} isBalanceLoading={isBalanceLoading} />
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
          ),
      )}
    </div>
  );
};

export default LedgersTabs;
