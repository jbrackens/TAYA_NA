import React, { useEffect, useState } from "react";
import { Row, Col, message } from "antd";
import { useTranslation } from "i18n";
import { useChangePassword } from "../../../../services/go-api";
import type { AppError } from "../../../../services/go-api";
import {
  NameCol,
  ValueCol,
  ChangeCol,
} from "../../personal-details/index.styled";
import { SpanPaddingTop, ErrorContainer } from "./index.styled";
import { MfaModalComponent } from "../../../auth/mfa-modal";
import { ErrorComponent } from "../../../errors";
import { CoreButton } from "../../../ui/button";
import { CoreModal } from "../../../ui/modal";
import { CoreForm } from "../../../ui/form";
import { CoreInput } from "../../../ui/input";

type FormValues = {
  password: string | undefined;
  newPassword: string | undefined;
  confirmPassword: string | undefined;
};

const PasswordEditorComponent: React.FC = () => {
  const { t } = useTranslation(["password-editor", "common", "register"]);
  const [formValue, setFormValue] = useState<FormValues>({} as FormValues);
  const [formFinished, setFormFinished] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isMfaCodeModalVisible, setMfaCodeModalVisible] = useState(false);
  const [isVerificationSuccess, setVerificationSuccess] = useState(false);
  const changePasswordMutation = useChangePassword();
  const [requestErrors, setRequestErrors] = useState<
    Array<{ errorCode: string }>
  >();

  const error = changePasswordMutation.error as AppError | undefined;

  const closeModal = () => {
    setIsModalVisible(false);
    changePasswordMutation.reset();
  };

  useEffect(() => {
    if (!changePasswordMutation.isSuccess) {
      setRequestErrors(error?.payload?.errors);
      return;
    }

    setRequestErrors([]);

    setVerificationSuccess(true);
    setMfaCodeModalVisible(false);
    setIsModalVisible(false);
    message.success(t("PASSWORD_UPDATED"));
    form.resetFields();
  }, [changePasswordMutation.isSuccess]);

  useEffect(() => {
    if (requestErrors && !isMfaCodeModalVisible) {
      setRequestErrors([]);
    }
  }, [isMfaCodeModalVisible]);

  const toggleMfaCallback = (code: string, id?: string): void => {
    if (formFinished) {
      const proceedSubmitRequest = async () => {
        const { password, newPassword } = formValue;
        if (!password || !newPassword) {
          setFormFinished(false);
          return;
        }
        changePasswordMutation.mutate({
          currentPassword: password,
          newPassword: newPassword,
          verificationId: id,
          verificationCode: code,
        });
      };
      proceedSubmitRequest();
      setFormFinished(false);
    }
  };

  const onFinish = (values: any): void => {
    setFormValue(values);
    setFormFinished(true);
    setMfaCodeModalVisible(true);
  };

  const [form] = CoreForm.useForm();

  useEffect(() => {
    if (!isModalVisible) {
      form.resetFields();
    }
  }, [isModalVisible]);

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
        sm={{ span: 24 }}
        xs={{ span: 24 }}
      >
        {t("PASSWORD")}
      </NameCol>
      <ValueCol
        xxl={{ span: 8 }}
        xl={{ span: 8 }}
        lg={{ span: 15 }}
        md={{ span: 15 }}
        sm={{ span: 20 }}
        xs={{ span: 20 }}
      >
        <SpanPaddingTop>*************</SpanPaddingTop>
      </ValueCol>
      <ChangeCol
        span={3}
        xxl={{ span: 8 }}
        xl={{ span: 8 }}
        lg={{ span: 4 }}
        md={{ span: 4 }}
        sm={{ span: 4 }}
        xs={{ span: 4 }}
      >
        <span onClick={() => setIsModalVisible(true)} role={"changeButton"}>
          {t("CHANGE")}
        </span>
      </ChangeCol>
      <CoreModal
        title={t("CHANGE_PASSWORD")}
        centered
        visible={isModalVisible}
        onCancel={closeModal}
        onOk={closeModal}
        maskClosable={false}
        footer={null}
      >
        <CoreForm
          layout={"vertical"}
          name="passwordForm"
          onFinish={onFinish}
          form={form}
          role={"editForm"}
        >
          <Col span={24}>
            <CoreForm.Item
              label={t("OLD_PASSWORD")}
              name="password"
              rules={[
                {
                  required: true,
                  message: t("OLD_PASSWORD_ERROR"),
                },
              ]}
            >
              <CoreInput type="password" />
            </CoreForm.Item>
          </Col>
          <Col span={12}></Col>

          <Col span={24}>
            <CoreForm.Item
              label={t("NEW_PASSWORD")}
              name="newPassword"
              rules={[
                {
                  required: true,
                  pattern: new RegExp(t("common:PASSWORD_REGEX")),
                  message: t("register:PASSWORD_FORMAT_ERROR"),
                },
              ]}
            >
              <CoreInput type="password" />
            </CoreForm.Item>
          </Col>
          <Col span={24}>
            <CoreForm.Item
              label={t("CONFIRM_PASSWORD")}
              name="confirmPassword"
              rules={[
                {
                  required: true,
                  message: t("CONFIRM_PASSWORD_ERROR"),
                },
                ({ getFieldValue }) => ({
                  validator(_rule, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(t("PASSWORD_NOT_MATCH"));
                  },
                }),
              ]}
            >
              <CoreInput type="password" />
            </CoreForm.Item>
          </Col>

          {error && (
            <Row justify="center" align="middle" gutter={[32, 32]} role="error">
              <Col span={24}>
                <ErrorContainer>
                  <ErrorComponent
                    errors={error.payload?.errors}
                    translationKey={"api-errors"}
                  />
                </ErrorContainer>
              </Col>
            </Row>
          )}

          <CoreForm.Item>
            <Row>
              <Col span={24}>
                <CoreButton
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={changePasswordMutation.isLoading}
                >
                  {t("UPDATE")}
                </CoreButton>
              </Col>
            </Row>
          </CoreForm.Item>
        </CoreForm>
      </CoreModal>

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

export { PasswordEditorComponent };
