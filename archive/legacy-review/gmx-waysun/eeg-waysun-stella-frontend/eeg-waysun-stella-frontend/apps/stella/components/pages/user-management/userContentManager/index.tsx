import React, { useEffect, useState } from "react";
import UserTable from "../userTable";
import AccountModal from "../accountModal";
import WalletModal from "../walletModal";
import ProjectModal from "../projectModal";
import ContextModal from "../contextModal";
import { ConfirmModal, message } from "ui";
import { useTranslation } from "next-export-i18n";
import { UserIdContext } from "./../userIdContext";
import { useApi } from "../../../../services/api-service";

const UserContentManager = ({ userData, loading, fetchUser }) => {
  const { t } = useTranslation();

  // --------- State variables ----------
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalType, setAccountModalType] = useState("");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [walletData, setWalletData] = useState([
    { currencyId: "", balanceValue: "" },
  ]);
  const [currencyList, setCurrencyList] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserDetails, setCurrentUserDetails] = useState({
    userId: "",
    isEnabled: false,
    username: "",
    email: "",
    projects: [],
  });

  // -------------- api's --------------
  const getWallet: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`wallet/admin/${currentUserId}/balances`, "GET");

  const getCurrency: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("wallet/admin/currencies", "GET");

  const deleteUser: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`ipm/users/${currentUserId}`, "DELETE");

  const patchUser: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`ipm/users/${currentUserId}`, "PATCH");

  // --------- useEffect section ----------
  useEffect(() => {
    if (showWalletModal) {
      getWallet.triggerApi();
      getCurrency.triggerApi();
      return;
    }
    getWallet.resetHookState();
    getCurrency.resetHookState();
  }, [showWalletModal]);

  useEffect(() => {
    if (getWallet.data && getWallet.data.status === "ok") {
      setWalletData(getWallet.data?.details?.balanceValues);
    }
  }, [getWallet.data]);

  useEffect(() => {
    if (getCurrency.data && getCurrency.data.status === "ok") {
      setCurrencyList(getCurrency.data?.details);
    }
  }, [getCurrency.data]);

  useEffect(() => {
    if (deleteUser.data && deleteUser.data.status === "ok") {
      message.success(t("DELETE_SUCCESS"));
      fetchUser();
      setDeleteConfirmModal(false);
    }
  }, [deleteUser.data]);

  useEffect(() => {
    if (patchUser.data && patchUser.data.status === "ok") {
      message.success(t("USER_PATCH_SUCCESS"));
      fetchUser();
      setShowAccountModal(false);
      setShowProjectModal(false);
    }
  }, [patchUser.data]);

  useEffect(() => {
    if (deleteUser.error) {
      message.error("FAILED");
      deleteUser.resetHookState();
      return;
    }
    if (patchUser.error) {
      message.error("FAILED");
      patchUser.resetHookState();
      return;
    }
  }, [deleteUser.error, patchUser.error]);

  // ------------ Functions --------------
  const deleteUserClicked = () => {
    deleteUser.triggerApi();
  };

  const modifyUser = (payload) => {
    patchUser.triggerApi(payload);
  };

  const updateWallet = () => {
    getWallet.triggerApi();
  };

  return (
    <>
      <UserIdContext.Provider
        value={{
          currentUserId,
          currentUserDetails,
          setCurrentUserId,
          setCurrentUserDetails,
        }}
      >
        <UserTable
          userData={userData}
          accountModal={(show, type) => {
            setShowAccountModal(show);
            type && setAccountModalType(type);
          }}
          walletModal={setShowWalletModal}
          projectModal={setShowProjectModal}
          loading={loading}
          onDeleteUser={() => setDeleteConfirmModal(true)}
          modifyUser={modifyUser}
          contextModal={setShowContextModal}
        />
        <AccountModal
          show={showAccountModal}
          type={accountModalType}
          label={accountModalType}
          close={() => {
            setShowAccountModal(false);
            setAccountModalType("");
          }}
          modifyUser={modifyUser}
          loading={patchUser.isLoading}
        />
        <WalletModal
          show={showWalletModal}
          close={() => setShowWalletModal(false)}
          data={walletData}
          currencies={currencyList}
          loading={getWallet.isLoading || getCurrency.isLoading}
          updateWallet={updateWallet}
        />
        <ConfirmModal
          show={deleteConfirmModal}
          close={() => setDeleteConfirmModal(false)}
          onConfirm={deleteUserClicked}
          header={`Delete user ${currentUserDetails.username}`}
          loading={deleteUser.isLoading}
        />
        <ProjectModal
          show={showProjectModal}
          close={() => setShowProjectModal(false)}
          modifyUser={modifyUser}
          loading={patchUser.isLoading}
        />
        <ContextModal
          show={showContextModal}
          close={() => setShowContextModal(false)}
        />
      </UserIdContext.Provider>
    </>
  );
};

export default UserContentManager;
