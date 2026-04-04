import React, { FC, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PlayerAccountStatusDraft } from "app/types";
import Component from "./Component";
import {
  fetchAccountStatus,
  fetchPlayersWithClosedAccounts,
  getAccountStatusState,
  updateAccountStatus,
} from "./accountStatusSlice";
import { openDialog } from "../../dialogs";
import { getRoles } from "../app";

const Container: FC<{ playerId: number }> = ({ playerId }) => {
  const dispatch = useDispatch();
  const {
    values: {
      verified,
      allowGameplay,
      preventLimitCancel,
      allowTransactions,
      loginBlocked,
      accountClosed,
      accountSuspended,
      gamblingProblem,
      riskProfile,
      ddMissing,
      depositLimitReached,
    },
  } = useSelector(getAccountStatusState);
  const userRoles = useSelector(getRoles);
  const isRiskManager = userRoles?.includes("riskManager");

  useEffect(() => {
    dispatch(fetchAccountStatus(playerId));
  }, [dispatch, playerId]);

  const handleAccountStatusToggle = useCallback(
    (field: keyof PlayerAccountStatusDraft, value: any) => {
      switch (field) {
        case "verified": {
          return dispatch(
            openDialog("account-status", {
              title: "Player identity verified and Due Diligence completed",
              callback: (reason: string) => dispatch(updateAccountStatus({ playerId, field, value, reason })),
            }),
          );
        }
        case "accountSuspended": {
          if (value) {
            return dispatch(openDialog("account-suspend", { playerId, value }));
          } else {
            return dispatch(
              openDialog("account-status", {
                title: "Account suspended",
                callback: (reason: string) => {
                  dispatch(updateAccountStatus({ playerId, field, value, reason }));
                  dispatch(updateAccountStatus({ playerId, field: "gamblingProblem", value: false, reason }));
                },
              }),
            );
          }
        }
        case "allowGameplay":
          return dispatch(
            openDialog("account-status", {
              title: "Allow gameplay",
              callback: (reason: string) => dispatch(updateAccountStatus({ playerId, field, value, reason })),
            }),
          );
        case "allowTransactions":
          return dispatch(
            openDialog("account-status", {
              title: "Allow transactions",
              callback: (reason: string) => dispatch(updateAccountStatus({ playerId, field, value, reason })),
            }),
          );

        default:
          return dispatch(updateAccountStatus({ playerId, field, value }));
      }
    },
    [dispatch, playerId],
  );

  const handleOpenPlayersWithClosedAccountsDialog = useCallback(() => {
    dispatch(openDialog("show-players-with-closed-accounts", { playerId }));
    dispatch(fetchPlayersWithClosedAccounts(playerId));
  }, [dispatch, playerId]);

  const handleOpenAskingForReasonDialog = useCallback(
    (field: keyof PlayerAccountStatusDraft, value: any) =>
      dispatch(openDialog("asking-for-reason", { playerId, field, value })),
    [dispatch, playerId],
  );

  return (
    <Component
      verified={verified}
      allowGameplay={allowGameplay}
      preventLimitCancel={preventLimitCancel}
      allowTransactions={allowTransactions}
      loginBlocked={loginBlocked}
      accountClosed={accountClosed}
      accountSuspended={accountSuspended}
      gamblingProblem={gamblingProblem}
      riskProfile={riskProfile}
      ddMissing={ddMissing}
      depositLimitReached={depositLimitReached}
      isRiskManager={isRiskManager}
      onAccountStatusToggle={handleAccountStatusToggle}
      onOpenPlayersWithClosedAccountsDialog={handleOpenPlayersWithClosedAccountsDialog}
      onOpenAskingForReasonDialog={handleOpenAskingForReasonDialog}
    />
  );
};

export default Container;
