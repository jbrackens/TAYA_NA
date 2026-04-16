import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "i18n";
import { Row, Col } from "antd";
import { CoreModal } from "../../ui/modal";
import { CoreButton } from "../../ui/button";
import {
  selectHasToAcceptResponsibilityCheck,
  setIsAccountDataUpdateNeeded,
  setUserData,
} from "../../../lib/slices/settingsSlice";
import { logOut } from "../../../lib/slices/authSlice";
import { useAcceptResponsibilityCheck } from "../../../services/go-api/compliance/compliance-hooks";
import { clearAuth } from "../../../services/go-api";

const DepositThresholdComponent: React.FC = () => {
  const { t } = useTranslation(["deposit-threshold"]);
  const dispatch = useDispatch();
  const isVisible = useSelector(selectHasToAcceptResponsibilityCheck);
  const acceptMutation = useAcceptResponsibilityCheck();

  if (!isVisible) {
    return null;
  }

  const handleAccept = () => {
    acceptMutation.mutate(undefined, {
      onSuccess: () => {
        dispatch(
          setUserData({
            hasToAcceptResponsibilityCheck: false,
          }),
        );
        dispatch(setIsAccountDataUpdateNeeded(true));
      },
    });
  };

  const handleLogout = () => {
    clearAuth();
    dispatch(logOut());
  };

  return (
    <CoreModal
      title={t("TITLE")}
      centered
      visible={isVisible}
      maskClosable={false}
      closable={false}
      footer={null}
    >
      <p>{t("DESCRIPTION")}</p>
      <Row gutter={16}>
        <Col span={12}>
          <CoreButton
            size="large"
            block
            onClick={handleLogout}
          >
            {t("LOGOUT")}
          </CoreButton>
        </Col>
        <Col span={12}>
          <CoreButton
            type="primary"
            size="large"
            block
            loading={acceptMutation.isLoading}
            onClick={handleAccept}
          >
            {t("ACCEPT")}
          </CoreButton>
        </Col>
      </Row>
    </CoreModal>
  );
};

export { DepositThresholdComponent };
