import { ChangeEvent, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";

import { dialogsSlice, useAppDispatch, useAppSelector, userInfoSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG, UserDraft, UserAccessSettings } from "@idefix-backoffice/idefix/types";

export const useUser = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(userInfoSlice.getUser);
  const isLoadingUser = useAppSelector(userInfoSlice.getIsLoadingUser);
  const accessSettings = useAppSelector(userInfoSlice.getUserAccessSettings);
  const isLoadingAccessSettings = useAppSelector(userInfoSlice.getIsLoadingAccessSettings);
  const log = useAppSelector(userInfoSlice.getUserLog);
  const isLoadingLogs = useAppSelector(userInfoSlice.getIsLoadingLog);
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);

  const handleCreateUser = useCallback(() => {
    dispatch(dialogsSlice.openDialog(DIALOG.CREATE_USER));
  }, [dispatch]);

  const handleUpdateUser = useCallback(
    async (values: Partial<UserDraft>) => {
      await dispatch(userInfoSlice.updateUser({ userId, ...values }));
    },
    [dispatch, userId]
  );

  const handleUpdateAccessSettings = useCallback(
    (key: keyof UserAccessSettings) => (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
      dispatch(userInfoSlice.updateAccessSettings({ userId, key, value: checked }));
    },
    [dispatch, userId]
  );

  useEffect(() => {
    dispatch(userInfoSlice.fetchUser(userId));
    dispatch(userInfoSlice.fetchAccessSettings(userId));
    dispatch(userInfoSlice.fetchLog(userId));
  }, [dispatch, userId]);

  return {
    user,
    isLoadingUser,
    accessSettings,
    isLoadingAccessSettings,
    log,
    isLoadingLogs,
    handleCreateUser,
    handleUpdateUser,
    handleUpdateAccessSettings
  };
};
