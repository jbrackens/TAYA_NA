import React from "react";
import { useRouter } from "next/router";
import { Row, Col, message } from "antd";
import { useTranslation } from "i18n";
import { ValidateErrorEntity } from "rc-field-form/lib/interface";
import { useApi } from "../../../services/api/api-service";
import { CoreInput } from "../../ui/input";
import { InputsContainer } from "../../ui/form/index.styled";
import { useState, useEffect } from "react";
import { StyledButton, Container } from "./index.styled";
import { ModalTypeEnum } from "../../../components/layout";
import { CoreForm } from "../../ui/form";
import { MfaModalComponent } from "../../auth/mfa-modal";

const ChangePasswordComponent: React.FC = () => {
  const { t } = useTranslation([
    "change-password",
    "register",
    "common",
    "api-errors",
  ]);
  const [isMfaModalVisible, setIsMfaModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isVerificationSuccess, setVerificationSuccess] = useState(false);
  const [requestErrors, setRequestErrors] = useState<
    Array<{ errorCode: string }>
  >();
  const router = useRouter();

  const { token } = router.query as {
    token?: string;
  };

  const { triggerApi, error, statusOk } = useApi(
    `password/reset/${token}`,
    "POST",
  );

  useEffect(() => {
    if (token === undefined) {
      router.push("/esports-bets");
    }
  }, [token]);

  const onFinish = (values: { password: string }): void => {
    setIsMfaModalVisible(true);
    setNewPassword(values.password);
  };

  const onRequestWithMfa = (code: string, verId?: string): void => {
    triggerApi({
      password: newPassword,
      verificationId: verId,
      verificationCode: code,
    });
    setRequestErrors([]);
  };

  const onFinishFailed = (errorInfo: ValidateErrorEntity): void => {
    // Form validation failed — errorInfo contains field-level details
  };

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 24 },
      xl: { span: 24 },
    },
  };

  useEffect(() => {
    if (!statusOk) {
      setRequestErrors(error?.payload?.errors);
      return;
    }
    setRequestErrors([]);
    setVerificationSuccess(true);
    message.success(t("SUCCESS_MESSAGE"));
    router.push(`esports-bets?showModal=${ModalTypeEnum.LOGIN}`);
  }, [statusOk]);

  useEffect(() => {
    if (requestErrors && !isMfaModalVisible) {
      setRequestErrors([]);
    }
  }, [isMfaModalVisible]);

  return (
    <>
      <Container>
        <CoreForm
          {...formItemLayout}
          name="changePassword"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <InputsContainer>
            <Row>
              <Col xl={{ span: 12 }} md={{ span: 16 }} sm={{ span: 24 }}>
                <CoreForm.Item
                  label={t("NEW_PASSWORD")}
                  name="password"
                  validateTrigger="onBlur"
                  rules={[
                    {
                      required: true,
                      pattern: new RegExp(t("common:PASSWORD_REGEX")),
                      message: t("register:PASSWORD_FORMAT_ERROR"),
                    },
                  ]}
                >
                  <CoreInput.Password />
                </CoreForm.Item>
              </Col>
            </Row>
            <Row>
              <Col xl={{ span: 12 }} md={{ span: 16 }} sm={{ span: 24 }}>
                <CoreForm.Item
                  label={t("CONFIRM_PASSWORD")}
                  name="confirm-password"
                  dependencies={["password"]}
                  rules={[
                    {
                      required: true,
                      message: t("CONFIRM_PASSWORD_ERROR"),
                    },
                    ({ getFieldValue }) => ({
                      validator(_rule, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          t("PASSWORDS_DO_NOT_MATCH_ERROR"),
                        );
                      },
                    }),
                  ]}
                >
                  <CoreInput.Password />
                </CoreForm.Item>
              </Col>
            </Row>
          </InputsContainer>
          <CoreForm.Item>
            <StyledButton
              type="primary"
              htmlType="submit"
              size="large"
              loading={isMfaModalVisible}
            >
              {t("CHANGE_PASSWORD_BUTTON")}
            </StyledButton>
          </CoreForm.Item>
        </CoreForm>
      </Container>
      <MfaModalComponent
        showModal={isMfaModalVisible}
        onRequestWithVerification={onRequestWithMfa}
        onCancelVerification={() => setIsMfaModalVisible(false)}
        requestCode={true}
        verificationSuccess={isVerificationSuccess}
        requestErrors={requestErrors}
        verificationCode={token}
      />
    </>
  );
};

export { ChangePasswordComponent };
