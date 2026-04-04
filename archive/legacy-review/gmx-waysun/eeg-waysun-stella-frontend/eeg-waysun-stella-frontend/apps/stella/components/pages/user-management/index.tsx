import React, { useEffect, useState } from "react";
import UserHeader from "./userHeader";
import CreateUserModal from "./createUserModal";
import UserContentManager from "./userContentManager";
import { defaultNamespaces } from "../defaults";
import { useApi } from "../../../services/api-service";
import { message } from "ui";
import { useTranslation } from "next-export-i18n";

const UserManagement = () => {
  const { t } = useTranslation();
  const [userDetailsList, setUserDetailsList] = useState([
    {
      userId: "",
      isEnabled: false,
      username: "",
      email: "",
      projects: [],
    },
  ]);
  const [createUserModalShow, setCreateUserModalShow] = useState(false);

  const getUser: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/users", "GET");

  const postUser: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/users", "POST");

  useEffect(() => {
    getUserDetails();
  }, []);

  useEffect(() => {
    if (!getUser.data) return;
    if (getUser.data.status !== "ok") return;

    setUserDetailsList(getUser.data?.details);
  }, [getUser.data]);

  useEffect(() => {
    if (!postUser.data) return;
    if (postUser.data.status !== "ok") return;

    setCreateUserModalShow(false);
    getUserDetails();
    message.success(t("USER_CREATED"));
    postUser.resetHookState();
  }, [postUser.data]);

  useEffect(() => {
    if (postUser.error) {
      message.success(t("FAILED"));
      postUser.resetHookState();
      return;
    }
    if (getUser.error) {
      message.success(t("FAILED"));
      getUser.resetHookState();
      return;
    }
  }, [postUser.error, getUser.error]);

  const createUser = (userDetails) => {
    postUser.triggerApi(userDetails);
  };

  const getUserDetails = () => {
    getUser.triggerApi();
  };

  return (
    <>
      <UserHeader createUser={setCreateUserModalShow} />
      <UserContentManager
        userData={userDetailsList}
        loading={getUser.isLoading}
        fetchUser={getUserDetails}
      />
      <CreateUserModal
        show={createUserModalShow}
        loading={postUser.isLoading}
        createUser={createUser}
        close={() => setCreateUserModalShow(false)}
      />
    </>
  );
};

UserManagement.namespacesRequired = [...defaultNamespaces];

export default UserManagement;
