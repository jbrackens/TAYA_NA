import {
  useAppDispatch,
  useAppSelector,
  accountStatusSlice,
  appSlice,
  dialogsSlice
} from "@idefix-backoffice/idefix/store";
import { DIALOG, PlayerAccountStatusDraft } from "@idefix-backoffice/idefix/types";
import { useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";

export const useAccountStatus = () => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string }>();
  const accountStatus = useAppSelector(accountStatusSlice.getAccountStatus);
  const isLoading = useAppSelector(accountStatusSlice.getIsLoadingAccountStatus);
  const userRoles = useAppSelector(appSlice.getRoles);
  const isRiskManager = userRoles?.includes("riskManager");
  const playerId = Number(params.playerId);

  const handleAccountStatusToggle = useCallback(
    (field: keyof PlayerAccountStatusDraft, value: any) => {
      switch (field) {
        case "verified": {
          return dispatch(
            dialogsSlice.openDialog(DIALOG.ACCOUNT_STATUS, {
              title: "Player identity verified and Due Diligence completed",
              callback: (reason: string) =>
                dispatch(accountStatusSlice.updateAccountStatus({ playerId, field, value, reason }))
            })
          );
        }
        case "accountSuspended": {
          if (value) {
            return dispatch(dialogsSlice.openDialog(DIALOG.ACCOUNT_SUSPEND, { playerId, value }));
          } else {
            return dispatch(
              dialogsSlice.openDialog(DIALOG.ACCOUNT_STATUS, {
                title: "Account suspended",
                callback: (reason: string) => {
                  dispatch(accountStatusSlice.updateAccountStatus({ playerId, field, value, reason }));
                  dispatch(
                    accountStatusSlice.updateAccountStatus({ playerId, field: "gamblingProblem", value: false, reason })
                  );
                }
              })
            );
          }
        }
        case "allowGameplay":
          return dispatch(
            dialogsSlice.openDialog(DIALOG.ACCOUNT_STATUS, {
              title: "Allow gameplay",
              callback: (reason: string) =>
                dispatch(accountStatusSlice.updateAccountStatus({ playerId, field, value, reason }))
            })
          );
        case "allowTransactions":
          return dispatch(
            dialogsSlice.openDialog(DIALOG.ACCOUNT_STATUS, {
              title: "Allow transactions",
              callback: (reason: string) =>
                dispatch(accountStatusSlice.updateAccountStatus({ playerId, field, value, reason }))
            })
          );

        default:
          return dispatch(accountStatusSlice.updateAccountStatus({ playerId, field, value }));
      }
    },
    [dispatch, playerId]
  );

  const handleOpenPlayersWithClosedAccountsDialog = useCallback(() => {
    dispatch(dialogsSlice.openDialog(DIALOG.SHOW_PLAYERS_WITH_CLOSED_ACCOUNTS, { playerId }));
    dispatch(accountStatusSlice.fetchPlayersWithClosedAccounts(playerId));
  }, [dispatch, playerId]);

  const handleOpenAskingForReasonDialog = useCallback(
    (field: keyof PlayerAccountStatusDraft, value: any) =>
      dispatch(dialogsSlice.openDialog(DIALOG.ASKING_FOR_REASON, { playerId, field, value })),
    [dispatch, playerId]
  );

  useEffect(() => {
    if (playerId) {
      dispatch(accountStatusSlice.fetchAccountStatus(playerId));
    }
  }, [dispatch, playerId]);

  return {
    accountStatus,
    isLoading,
    isRiskManager,
    handleAccountStatusToggle,
    handleOpenPlayersWithClosedAccountsDialog,
    handleOpenAskingForReasonDialog
  };
};
