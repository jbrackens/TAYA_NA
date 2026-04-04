import { useLocation, useNavigate, useParams } from "react-router-dom";
import { SyntheticEvent, useCallback, useEffect, useState } from "react";

import {
  playerSlice,
  rewardsSlice,
  dialogsSlice,
  useAppDispatch,
  useAppSelector
} from "@idefix-backoffice/idefix/store";
import { DIALOG, RewardGroup } from "@idefix-backoffice/idefix/types";

export const useLedgersTabs = () => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string; groupId: string }>();
  const playerId = Number(params.playerId);
  const groupId = params.groupId;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const brandId = useAppSelector(playerSlice.getPlayerBrandId);
  const ledgers = useAppSelector(rewardsSlice.getLedgers);
  const isLedgersLoading = useAppSelector(rewardsSlice.getIsLedgersLoading);
  const balance = useAppSelector(rewardsSlice.getBalance);
  const isBalanceLoading = useAppSelector(rewardsSlice.getIsBalanceLoading);
  const initGroups = useAppSelector(rewardsSlice.getInitGroups) as RewardGroup[] | null;
  const defaultIndex = initGroups?.findIndex(group => group.groupId === groupId);
  const [selectedTab, setSelectedValue] = useState(0);

  const handleChange = useCallback(
    (_event: SyntheticEvent, value: number) => {
      setSelectedValue(value);
      if (initGroups) {
        const { groupId } = initGroups[value];
        const newPath = `${pathname.substring(0, pathname.lastIndexOf("rewards"))}rewards/${groupId}`;
        navigate(newPath);
      }
    },
    [initGroups, pathname, navigate]
  );

  const handleAddReward = useCallback(() => {
    dispatch(
      dialogsSlice.openDialog(DIALOG.ADD_REWARD, {
        playerId,
        brandId,
        groupId,
        groupName: initGroups![selectedTab].groupName
      })
    );
  }, [dispatch, playerId, brandId, groupId, initGroups, selectedTab]);

  const handleMarkUsed = useCallback(
    (groupId: string) => dispatch(dialogsSlice.openDialog(DIALOG.CONFIRM_MARK_AS_USED, { playerId, groupId })),
    [dispatch, playerId]
  );

  // const handleFetchLedgers = useCallback(
  //   (pageSize?: number) => {
  //     if (pageSize && pageSize < 105) return; // to prevent second api call if there is little data
  //     dispatch(rewardsSlice.fetchPlayerLedgers({ playerId, params: { pageSize, group: groupId, brandId } }));
  //   },
  //   [brandId, dispatch, groupId, playerId]
  // );

  useEffect(() => {
    if (brandId && groupId) {
      dispatch(rewardsSlice.fetchPlayerLedgers({ playerId, params: { group: groupId, brandId } }));
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

  return {
    ledgers,
    isLedgersLoading,
    balance,
    isBalanceLoading,
    initGroups,
    selectedTab,
    handleChange,
    handleAddReward,
    handleMarkUsed
  };
};
