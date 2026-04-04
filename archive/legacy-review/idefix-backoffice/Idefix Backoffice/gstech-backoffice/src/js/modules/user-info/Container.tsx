import React, { ChangeEvent, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { openDialog } from "../../dialogs";
import { fetchAccessSettings, fetchLog, fetchUser, getUser, updateAccessSettings } from "./userInfoSlice";
import Component from "./Component";

const Container = () => {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const userInfoState = useSelector(getUser);

  const { isFetchingUser, user, isFetchingAccessSettings, accessSettings, isFetchingLog, log } = userInfoState;

  useEffect(() => {
    dispatch(fetchUser(Number(userId)));
    dispatch(fetchAccessSettings(Number(userId)));
    dispatch(fetchLog(Number(userId)));
  }, [userId, dispatch]);

  const handleToggleAccessSettings = useCallback(
    (key: string) => (event: ChangeEvent<{}>, value: boolean) => {
      dispatch(updateAccessSettings({ userId: Number(userId), key, value }));
    },
    [userId, dispatch],
  );

  const handleCreateUser = useCallback(() => dispatch(openDialog("create-user")), [dispatch]);

  return (
    <>
      <Component
        isFetchingUser={isFetchingUser}
        user={user}
        isFetchingAccessSettings={isFetchingAccessSettings}
        accessSettings={accessSettings}
        isFetchingLog={isFetchingLog}
        log={log}
        onToggleAccessSettings={handleToggleAccessSettings}
        onCreateUser={handleCreateUser}
      />
    </>
  );
};

export default Container;
