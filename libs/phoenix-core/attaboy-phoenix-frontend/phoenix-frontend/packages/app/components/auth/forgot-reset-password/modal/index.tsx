import React from "react";
import { useDispatch } from "react-redux";
import { Row, Col, message } from "antd";
import { useTranslation } from "i18n";
import { ValidateErrorEntity } from "rc-field-form/lib/interface";
import {
  hideForgotPasswordModal,
  hideResetPasswordModal,
} from "../../../../lib/slices/authSlice";
import { useApi } from "../../../../services/api/api-service";
import { ForgotPasswordButton } from "../index.styled";
import { useEffect } from "react";
import { ModalTypeEnum } from "../../../layout";
import { useRouter } from "next/router";
import { ErrorComponent } from "../../../errors";
import { CoreButton } from "../../../ui/button";
import { CoreModal } from "../../../ui/modal";
import { CoreForm } from "../../../ui/form";
import { CoreInput } from "../../../ui/input";
import { InputsContainer } from "../../../ui/form/index.styled";

export enum ForgotResetPasswordModalType {
  RESET = "RESET",
  FORGOT = "FORGOT",
}

type ForgotResetPasswordModalComponent = {
  isVisible: boolean;
  type:
    | ForgotResetPasswordModalType.RESET
    | ForgotResetPasswordModalType.FORGOT;
};

export const ForgotResetPasswordModalComponent: React.FC<ForgotResetPasswordModalComponent> = ({
  isVisible,
  type,
}) => {
  const { t } = useTranslation(["forgot-password", "api-errors"]);
  const dispatch = useDispatch();
  const { triggerApi, isLoading, error, statusOk, resetHookState } = useApi(
    "password/forgot",
    "POST",
  );
  const router = useRouter();

  const dispatchHideModal = () => {
    type === ForgotResetPasswordModalType.FORGOT
      ? dispatch(hideForgotPasswordModal())
      : dispatch(hideResetPasswordModal());
  };

  const onFinish = (values: any): void => {
    triggerApi(
      {
        email: values.email,
      },
      undefined,
      {
        "X-Dev-Domain": `${window.location.protocol}//${window.location.hostname}:${window.location.port}`,
      },
    );
  };

  const onFinishFailed = (errorInfo: ValidateErrorEntity<any>): void => {
    console.log("Failed:", errorInfo);
  };

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 24 },
      xl: { span: 24 },
    },
  };

  useEffect(() => {
    if (statusOk) {
      message.success(t("PASSWORD_RESET_MESSAGE"));
      dispatchHideModal();
      router.push(`esports-bets?showModal=${ModalTypeEnum.LOGIN}`);
    }
  }, [statusOk]);

  const [form] = CoreForm.useForm();

  useEffect(() => {
    if (!isVisible) {
      form.resetFields();
      resetHookState();
    }
  }, [isVisible]);

  return (
    <CoreModal
      title={t(type)}
      centered
      visible={isVisible}
      onOk={dispatchHideModal}
      onCancel={dispatchHideModal}
      footer={null}
      maskClosable={false}
    >
      <CoreForm
        {...formItemLayout}
        name="forgotPasswordForm"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        form={form}
      >
        <InputsContainer>
          <CoreForm.Item
            label={t("EMAIL")}
            name="email"
            rules={[
              {
                required: true,
                type: "email",
                message: t("EMAIL_ERROR"),
              },
            ]}
          >
            <CoreInput
              onBlur={(value) => {
                form.setFieldsValue({
                  email: value.currentTarget.value.trim(),
                });
              }}
            />
          </CoreForm.Item>
        </InputsContainer>
        {(isLoading || error) && (
          <Row
            justify="center"
            align="middle"
            gutter={[32, 32]}
            role={isLoading ? "loading" : "error"}
          >
            {error && (
              <Col span={24}>
                <ErrorComponent
                  errors={error?.payload.errors}
                  translationKey={"api-errors"}
                />
              </Col>
            )}
          </Row>
        )}
        <CoreForm.Item>
          <ForgotPasswordButton
            type="primary"
            htmlType="submit"
            role="forgotPasswordButton"
            size="large"
            loading={isLoading}
            block
          >
            {t(type)}
          </ForgotPasswordButton>
        </CoreForm.Item>
        <CoreForm.Item>
          <CoreButton
            type="default"
            size="large"
            block
            onClick={dispatchHideModal}
          >
            {t("Cancel")}
          </CoreButton>
        </CoreForm.Item>
      </CoreForm>
    </CoreModal>
  );
};
