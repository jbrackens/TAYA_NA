import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { openDialog } from "../../dialogs";
import { changePlayerTab } from "../sidebar";
import { fetchPlayer, getPlayer, getStatus } from "./playerSlice";
import { fetchAccountStatus, getAccountStatus } from "../account-status";
import { fetchActiveLimits, getActiveLimits } from "../limits";
import Component from "./Component";

const Container = () => {
  const [tabValue, setTabValue] = useState(4);
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const params = useParams();
  const playerId = Number(params.playerId);
  const { info: playerInfo, status, isFetchingStatus } = useSelector(getPlayer);
  const activeLimits = useSelector(getActiveLimits);
  const accountStatus = useSelector(getAccountStatus);

  const kycDocuments = playerInfo?.kycDocuments || [];
  const withdrawals = playerInfo?.withdrawals || [];
  const fraudIds = playerInfo?.fraudIds || [];

  const setDefaultTab = useCallback((type: string) => {
    const tabs = [
      "tasks",
      "player-info",
      "documents",
      "bonuses",
      "history-and-notes",
      "transactions",
      "payments",
      "limits",
      "risks",
      "promotions",
      "rewards",
      "campaigns",
    ];
    const currentTab = tabs.indexOf(type);
    setTabValue(currentTab);
  }, []);

  useEffect(() => {
    const type = pathname.split("/")[3];

    dispatch(getStatus(playerId));
    dispatch(fetchPlayer(playerId));
    setDefaultTab(type);
  }, [dispatch, playerId, pathname, setDefaultTab]);

  const handleTaskClick = useCallback(
    (taskType: string) => dispatch(changePlayerTab(playerId, `tasks/${taskType}`)),
    [dispatch, playerId],
  );

  const handleChangeTab = useCallback(
    (tab: string) => {
      dispatch(getStatus(playerId));
      dispatch(changePlayerTab(playerId, tab));
    },
    [dispatch, playerId],
  );

  const handleAddTransaction = useCallback(
    () => dispatch(openDialog("add-transaction", playerId)),
    [dispatch, playerId],
  );

  const handleAddPaymentAccount = useCallback(
    () => dispatch(openDialog("add-payment-account", playerId)),
    [dispatch, playerId],
  );

  const handleAddPlayerNote = useCallback(
    () => dispatch(openDialog("add-player-note", playerId)),
    [dispatch, playerId],
  );

  const handleRegisterGambling = useCallback(
    () => dispatch(openDialog("register-gambling-problem", playerId)),
    [dispatch, playerId],
  );

  const handleTriggerManualTask = useCallback(
    () => dispatch(openDialog("trigger-manual-task", playerId)),
    [dispatch, playerId],
  );

  const handleCreditBonus = useCallback(() => dispatch(openDialog("credit-bonus", playerId)), [dispatch, playerId]);
  const handleChangeTabValue = useCallback((_e: any, newValue: number) => setTabValue(newValue), []);
  const handleAddDocuments = useCallback(() => dispatch(openDialog("add-documents", playerId)), [dispatch, playerId]);
  const handleFetchActiveLimits = useCallback(() => dispatch(fetchActiveLimits(playerId)), [dispatch, playerId]);
  const handleFetchAccountStatus = useCallback(() => dispatch(fetchAccountStatus(playerId)), [dispatch, playerId]);
  const handleRequestDocuments = useCallback(
    () => dispatch(openDialog("request-documents", playerId)),
    [dispatch, playerId],
  );

  return (
    <Component
      children={<Outlet />}
      playerInfo={playerInfo}
      status={status}
      isFetchingStatus={isFetchingStatus}
      activeLimits={activeLimits}
      accountStatus={accountStatus}
      playerId={playerId}
      kycDocuments={kycDocuments}
      withdrawals={withdrawals}
      fraudIds={fraudIds}
      tabValue={tabValue}
      onAddTransaction={handleAddTransaction}
      onCreditBonus={handleCreditBonus}
      onAddPaymentAccount={handleAddPaymentAccount}
      onAddPlayerNote={handleAddPlayerNote}
      onAddDocuments={handleAddDocuments}
      onRegisterGambling={handleRegisterGambling}
      onTriggerManualTask={handleTriggerManualTask}
      onTaskClick={handleTaskClick}
      onChangeTab={handleChangeTab}
      onChangeTabValue={handleChangeTabValue}
      onRequestDocuments={handleRequestDocuments}
      onFetchActiveLimits={handleFetchActiveLimits}
      onFetchAccountStatus={handleFetchAccountStatus}
    />
  );
};

export default Container;
