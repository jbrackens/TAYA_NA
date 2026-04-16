import React from "react";
import { useTranslation } from "i18n";
import { useApi } from "../../../services/api/api-service";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import {
  setIsAccountDataUpdateNeeded,
  selectHasToAcceptResponsibilityCheck,
} from "../../../lib/slices/settingsSlice";
import { ContentContainer } from "../accept-terms/index.styles";
import { useLogout } from "../../../hooks/useLogout";
import { useCurrency } from "../../../services/currency";
import { selectThresholdValue } from "../../../lib/slices/siteSettingsSlice";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";
import { CoreButton } from "../../ui/button";
import { CoreModal } from "../../ui/modal";

const DepositThresholdComponent: React.FC = () => {
  const { t } = useTranslation(["deposit-threshold", "responsible-gaming"]);
  const acceptLimitsInfo = useApi("responsibility-check/accept", "PUT");
  const { logOutAndRemoveToken } = useLogout();
  const dispatch = useDispatch();
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const isDepositThresholdModalVisible = useSelector(
    selectHasToAcceptResponsibilityCheck,
  );

  const thresholdValue = useSelector(selectThresholdValue);
  const { getCurrency } = useCurrency();

  const onAcceptLimitsInfo = () => {
    acceptLimitsInfo.triggerApi();
  };

  const onLogout = () => {
    logOutAndRemoveToken();
  };

  useEffect(() => {
    if (acceptLimitsInfo.error) {
      setIsErrorModalVisible(true);
      acceptLimitsInfo.resetHookState();
    }
  }, [acceptLimitsInfo.error]);

  useEffect(() => {
    if (acceptLimitsInfo.statusOk) {
      dispatch(setIsAccountDataUpdateNeeded(true));
    }
  }, [acceptLimitsInfo.statusOk]);

  return (
    <>
      <CoreModal
        visible={isDepositThresholdModalVisible}
        title={t("deposit-threshold:TITLE")}
        closable={false}
        footer={[
          <CoreButton type="default" key="logout" onClick={onLogout}>
            {t("deposit-threshold:LOGOUT")}
          </CoreButton>,
          <CoreButton
            key="accept"
            type="primary"
            loading={acceptLimitsInfo.isLoading}
            onClick={onAcceptLimitsInfo}
          >
            {t("deposit-threshold:ACCEPT")}
          </CoreButton>,
        ]}
      >
        <ContentContainer>
          <p>
            {t("deposit-threshold:MODAL_CONTENT", {
              currency: getCurrency(),
              value: thresholdValue,
            })}
          </p>
          <p>{t("responsible-gaming:SET_LIMITS")}</p>
          <p>{t("responsible-gaming:CALL_GAMBLER")}</p>
        </ContentContainer>
      </CoreModal>
      <ResultModalComponent
        status={StatusEnum.ERROR}
        title={t("TITLE_FAIL")}
        onOk={() => setIsErrorModalVisible(false)}
        okText={t("OK")}
        isVisible={isErrorModalVisible}
      />
    </>
  );
};

export { DepositThresholdComponent };
