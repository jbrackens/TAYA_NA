import { Skeleton, Col, message } from "antd";
import { isBoolean, isEmpty } from "lodash";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  // selectRecentActivities,
  // getUserRecentActivitiesSucceeded,
  getUserDetails,
  getUserDetailsSucceeded,
  selectBasicData,
} from "../../../lib/slices/usersDetailsSlice";
import { useApi } from "../../../services/api/api-service";
import { useTranslation } from "i18n";
// import { UsersRecentActivity } from "../../../components/users/recent-activity";
import { TabSectionRow } from "../../../components/layout/tabs/index.styled";
import { Method, Id, Layout, useSpy } from "@phoenix-ui/utils";
// import UserLifecycleCoolOff from "../../../components/users/lifecycle/cool-off";
import { FormValues } from "../../../components/form/modal";
import { BasicDetails } from "./basic-details";
import { ActivityDetails } from "./activity-details";
import { ModifyPunterModal } from "./../../../components/ModifyPunterModal";
import { FinancialSummary } from "./financial-summary";
import { UserDetailsRow } from "./index.styled";
import { AccountDatesRow } from "../../../components/users/account-dates-row";
import { TransctionModal } from "../../../components/users/transaction-modal";
import { UsersPageHeader } from "../../../components/users/header";

type UsersDetailsContainerProps = {
  id: Id;
};

type EditModalDataType = {
  field: string;
  currentValue: {};
};

const UsersDetailsContainer = ({ id }: UsersDetailsContainerProps) => {
  const { t } = useTranslation("page-users-details");
  const { spy } = useSpy();
  const dispatch = useDispatch();
  const [forceUpdate, setForceUpdate] = useState(true);
  const [limitsModalVisible, setLimitsModalVisible] = useState(false);
  const [updatedLimits, setUpdatedLimits] = useState<FormValues>({});
  const [updatedLimitsCall, setUpdatedLimitsCall] = useState(false);
  const basicData = useSelector(selectBasicData);
  const [isTransactionModalVisible, setIsTransactionModalVisbile] = useState(
    false,
  );
  const [editModalData, setEditModalData] = useState<EditModalDataType>({
    field: "",
    currentValue: {},
  });
  const [displayEditModal, setDisplayEditModal] = useState(false);
  // const recentActivities = useSelector(selectRecentActivities);
  const [triggerUsersDetailsApi, loading] = useApi(
    "admin/punters/:id",
    Method.GET,
    getUserDetailsSucceeded,
  );

  // const [triggerRecentActivitiesApi, isLoadingRecentActivities] = useApi(
  //   "admin/punters/:id/recent-activities",
  //   Method.GET,
  //   getUserRecentActivitiesSucceeded,
  // );
  const [
    triggerUsersDetailsLimitsDepositsUpdate,
    loadingLimitDeposits,
    dataDeposits,
  ] = useApi("admin/punters/:id/limits/deposit", Method.PUT);
  const [
    triggerUsersDetailsLimitsLossesUpdate,
    loadingLimitLosses,
    dataLosses,
  ] = useApi("admin/punters/:id/limits/stake", Method.PUT);
  const [
    triggerUsersDetailsLimitsSessionUpdate,
    loadingLimitSession,
    dataSession,
  ] = useApi("admin/punters/:id/limits/session", Method.PUT);
  const triggerUsersDetailsLimitsUpdate: any = {
    deposit: triggerUsersDetailsLimitsDepositsUpdate,
    stake: triggerUsersDetailsLimitsLossesUpdate,
    session: triggerUsersDetailsLimitsSessionUpdate,
  };
  const limitsUpdateSucceeded = [
    dataDeposits?.succeeded,
    dataLosses?.succeeded,
    dataSession?.succeeded,
  ];
  const limitsUpdateInProgress =
    loadingLimitDeposits || loadingLimitLosses || loadingLimitSession;

  // to rerender transactions when needed
  const [detailsKey, setDetailsKey] = useState(0);

  useEffect((): any => {
    if (forceUpdate) {
      const fetchUsers = async () => {
        try {
          dispatch(getUserDetails());
          await triggerUsersDetailsApi(undefined, {
            id,
          });
          // await triggerRecentActivitiesApi(undefined, {
          //   id,
          // });
          setForceUpdate(false);
        } catch (err) {
          console.error({ err });
        }
      };
      fetchUsers();
    }
  }, [forceUpdate]);

  useEffect((): any => {
    if (updatedLimitsCall) {
      const trigger = async () => {
        await Promise.all(
          Object.keys(updatedLimits).map(
            async (action: string) =>
              await triggerUsersDetailsLimitsUpdate[action](
                updatedLimits[action],
                {
                  id,
                },
              ),
          ),
        );
        setUpdatedLimitsCall(false);
      };
      if (isEmpty(updatedLimits)) {
        setUpdatedLimitsCall(false);
      } else {
        trigger();
      }
    }
  }, [updatedLimitsCall]);

  spy(limitsUpdateSucceeded, ({ values }) => {
    const successCount = values.filter(
      (e: boolean | undefined) => isBoolean(e) && e,
    ).length;
    if (successCount === Object.keys(updatedLimits).length) {
      setUpdatedLimits({});
      setLimitsModalVisible(false);
    }
  });

  const onLifecycleChange = () => {
    setForceUpdate(true);
  };

  const onEditModalComplete = (success: boolean) => {
    success
      ? message.success(t("EDIT_SUCCESSFUL"))
      : message.error(t("EDIT_UNSUCCESSFUL"));
    onLifecycleChange();
  };

  const onSubmitUpdateLimits = (values: FormValues) => {
    setUpdatedLimits(values);
    setUpdatedLimitsCall(true);
  };

  const showTransactionModal = () => {
    setIsTransactionModalVisbile(true);
  };

  if (isEmpty(basicData)) {
    return <Skeleton loading={true} avatar active />;
  }

  const editUserModalProps = (field = "", currentValue = {}) => {
    if (field.length > 0) {
      setDisplayEditModal(true);
    } else {
      setTimeout(() => {
        setDisplayEditModal(false);
      }, 300);
    }
    const editModalDetails = {
      field: field,
      currentValue: currentValue,
    };
    setEditModalData(editModalDetails);
  };

  return (
    <>
      <UsersPageHeader
        name={basicData.name}
        editUserModalProps={editUserModalProps}
        richStatus={basicData.richStatus}
        id={id}
        status={basicData.status}
        coolOff={basicData.coolOff}
        isTestAccount={basicData.isTestAccount}
        loading={loading}
        onLifecycleChange={onLifecycleChange}
        showTransactionModal={showTransactionModal}
      />
      <AccountDatesRow
        signUpDate={basicData.signUpDate}
        verifiedAt={basicData.verifiedAt}
        lastSignIn={basicData.lastSignIn}
        acceptedAt={basicData.terms.acceptedAt}
        version={basicData.terms.version}
      />
      <UserDetailsRow gutter={[16, 16]}>
        <Col xxl={12} xl={12} lg={24} md={24}>
          <BasicDetails
            Layout={Layout}
            basicData={basicData}
            setLimitsModalVisible={setLimitsModalVisible}
            limitsModalVisible={limitsModalVisible}
            onSubmitUpdateLimits={onSubmitUpdateLimits}
            limitsUpdateInProgress={limitsUpdateInProgress}
            setForceUpdate={setForceUpdate}
            userDataLoading={loading}
            editUserDetails={editUserModalProps}
          />
        </Col>
        <Col xxl={12} xl={12} lg={24} md={24}>
          <FinancialSummary id={basicData.userId} key={detailsKey + 1} />
        </Col>
      </UserDetailsRow>

      <TabSectionRow gutter={16}>
        <Col span={24}>
          <ActivityDetails id={id} key={detailsKey} />
        </Col>
      </TabSectionRow>
      <TransctionModal
        isTransactionModalVisible={isTransactionModalVisible}
        setIsTransactionModalVisbile={setIsTransactionModalVisbile}
        id={id}
        setDetailsKey={setDetailsKey}
      />
      {displayEditModal && (
        <ModifyPunterModal
          fieldName={editModalData.field}
          defaultValue={editModalData.currentValue}
          closeModal={editUserModalProps}
          onComplete={onEditModalComplete}
          punterId={basicData?.userId}
        />
      )}
    </>
  );
};

export default UsersDetailsContainer;
