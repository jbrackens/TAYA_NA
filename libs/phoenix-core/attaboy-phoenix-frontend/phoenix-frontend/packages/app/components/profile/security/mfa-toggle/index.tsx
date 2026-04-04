import React, { useEffect, useState } from "react";
import { useTranslation } from "i18n";
import { useApi } from "../../../../services/api/api-service";
import { NameCol, ChangeCol } from "../../personal-details/index.styled";
import { MfaModalComponent } from "../../../auth/mfa-modal";
import { CoreForm } from "../../../ui/form";
import { CoreSwitch } from "../../../ui/switch";

const MfaToggleComponent: React.FC = () => {
  const { t } = useTranslation(["mfa"]);
  const [isMfaEnabled, setMfaEnabled] = useState(false);
  const [isMfaCodeModalVisible, setMfaCodeModalVisible] = useState(false);
  const [isVerificationSuccess, setVerificationSuccess] = useState(false);
  const getMeData = useApi("profile/me", "GET");
  const useMfa = useApi("profile/multi-factor-authentication", "PUT");
  const [requestErrors, setRequestErrors] = useState<
    Array<{ errorCode: string }>
  >();

  useEffect(() => {
    getMeData.triggerApi();
  }, []);

  useEffect(() => {
    if (!useMfa.statusOk) {
      setRequestErrors(useMfa.error?.payload?.errors);
      return;
    }

    setRequestErrors([]);

    setVerificationSuccess(true);
    setMfaCodeModalVisible(false);
    setMfaEnabled(!isMfaEnabled);
    getMeData.triggerApi();
  }, [useMfa.statusOk]);

  useEffect(() => {
    if (requestErrors && !isMfaCodeModalVisible) {
      setRequestErrors([]);
    }
  }, [isMfaCodeModalVisible]);

  useEffect(() => {
    if (!getMeData.statusOk) return;
    const data = getMeData.data;
    setMfaEnabled(data.twoFactorAuthEnabled);
  }, [getMeData.statusOk]);

  const toggleMfaCallback = (code: string, id?: string): void => {
    useMfa.triggerApi({
      enabled: !isMfaEnabled,
      verificationId: id,
      verificationCode: code,
    });
  };

  const toggleMfa = (): void => {
    setMfaCodeModalVisible(true);
  };

  const cancelMfa = (): void => {
    setMfaCodeModalVisible(false);
  };

  return (
    <>
      <NameCol
        xxl={{ span: 8 }}
        xl={{ span: 8 }}
        lg={{ span: 5 }}
        md={{ span: 5 }}
        sm={{ span: 8 }}
        xs={{ span: 8 }}
      >
        {t("SETTINGS_TITLE")}
      </NameCol>
      <ChangeCol
        xxl={{ span: 16 }}
        xl={{ span: 16 }}
        lg={{ span: 19 }}
        md={{ span: 19 }}
        sm={{ span: 16 }}
        xs={{ span: 16 }}
      >
        <CoreForm>
          <CoreSwitch
            onChange={toggleMfa}
            checked={isMfaEnabled}
            loading={getMeData.isLoading}
          />
        </CoreForm>
      </ChangeCol>
      <MfaModalComponent
        showModal={isMfaCodeModalVisible}
        onRequestWithVerification={toggleMfaCallback}
        onCancelVerification={cancelMfa}
        requestCode={true}
        verificationSuccess={isVerificationSuccess}
        requestErrors={requestErrors}
      />
    </>
  );
};

export { MfaToggleComponent };
