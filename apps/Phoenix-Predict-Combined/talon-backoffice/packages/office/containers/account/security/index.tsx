import { useTranslation } from "i18n";
import { Button, Card, Form, Spin, Switch } from "antd";
import { Method } from "@phoenix-ui/utils";
import { useEffect, useState } from "react";
import { useApi } from "../../../services/api/api-service";
import { MfaModalComponent } from "../../../components/auth/mfa-modal";

export const SecurityContainer = () => {
  const { t } = useTranslation("page-security");
  const [mfaValue, setMfaValue] = useState(false);
  const [isMfaEnabled, setMfaEnabled] = useState(false);
  const [isMfaCodeModalVisible, setMfaCodeModalVisible] = useState(false);
  const [isVerificationSuccess, setVerificationSuccess] = useState(false);
  const [form] = Form.useForm();
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [requestErrors, setRequestErrors] = useState<
    Array<{ errorCode: string }>
  >();
  const [triggerMeApi, isMeDataLoading, meDataResponse] = useApi(
    "profile/me",
    Method.GET,
  );
  const [shouldResetMeData, setShouldResetMeData] = useState(true);

  useEffect(() => {
    if (shouldResetMeData) {
      triggerMeApi();
      setShouldResetMeData(false);
    }
  }, [shouldResetMeData]);

  useEffect(() => {
    if (meDataResponse.data) {
      setMfaValue(meDataResponse.data.twoFactorAuthEnabled);
    }
  }, [meDataResponse]);

  const [triggerApi, isLoading, response] = useApi(
    "profile/multi-factor-authentication",
    Method.PUT,
  );

  useEffect(() => {
    form.resetFields();
    setIsButtonDisabled(true);
  }, [mfaValue]);

  useEffect(() => {
    if (!response.succeeded) {
      setRequestErrors(response.error?.payload?.errors);
      return;
    }
    setRequestErrors([]);
    setVerificationSuccess(true);
    setMfaCodeModalVisible(false);
    setMfaEnabled(!isMfaEnabled);
    setShouldResetMeData(true);
  }, [response.succeeded]);

  useEffect(() => {
    if (requestErrors && !isMfaCodeModalVisible) {
      setRequestErrors([]);
    }
  }, [isMfaCodeModalVisible]);

  const toggleMfaCallback = (code: string, id?: string): void => {
    triggerApi({
      enabled: form.getFieldValue("mfa"),
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

  const onFinish = () => {
    toggleMfa();
  };

  return (
    <Spin spinning={isMeDataLoading || isLoading}>
      <Card>
        <Form
          layout="vertical"
          onFinish={onFinish}
          form={form}
          initialValues={{
            mfa: mfaValue,
          }}
          onValuesChange={(values) =>
            setIsButtonDisabled(values.mfa === mfaValue)
          }
        >
          <Form.Item label={t("MFA")} name="mfa" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              disabled={isButtonDisabled}
            >
              {t("SUBMIT")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <MfaModalComponent
        showModal={isMfaCodeModalVisible}
        onRequestWithVerification={toggleMfaCallback}
        onCancelVerification={cancelMfa}
        requestCode={true}
        verificationSuccess={isVerificationSuccess}
        requestErrors={requestErrors}
      />
    </Spin>
  );
};
