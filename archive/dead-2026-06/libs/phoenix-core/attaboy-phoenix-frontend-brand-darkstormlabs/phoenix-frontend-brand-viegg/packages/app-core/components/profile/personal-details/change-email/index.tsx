import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Input, Row, Col } from "antd";
import { useTranslation } from "i18n";
import { useApi } from "../../../../services/api/api-service";
import { MfaModalComponent } from "../../../auth/mfa-modal";
import { setIsAccountDataUpdateNeeded } from "../../../../lib/slices/settingsSlice";
import { ErrorComponent } from "../../../errors";
import { CoreButton } from "../../../ui/button";
import { CoreModal } from "../../../ui/modal";
import { CoreForm } from "../../../ui/form";

type ChangeEmailModalProps = {
  isModalVisible: boolean;
  setIsModalVisible: (isVisible: boolean) => void;
};

type FormValues = {
  email: string | undefined;
};

const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  isModalVisible,
  setIsModalVisible,
}) => {
  const { t } = useTranslation(["personal-details"]);
  const dispatch = useDispatch();
  const [form] = CoreForm.useForm();
  const [formValues, setFormValue] = useState<FormValues>({} as FormValues);
  const putEmail = useApi("profile/email", "PUT");
  const [isMfaCodeModalVisible, setMfaCodeModalVisible] = useState(false);
  const [isVerificationSuccess, setVerificationSuccess] = useState(false);
  const [requestErrors, setRequestErrors] = useState<
    Array<{ errorCode: string }>
  >();

  useEffect(() => {
    if (!isModalVisible) {
      form.resetFields();
      return;
    }

    setVerificationSuccess(false);
  }, [isModalVisible]);

  useEffect(() => {
    if (!putEmail.statusOk) {
      setRequestErrors(putEmail.error?.payload?.errors);
      return;
    }

    setRequestErrors([]);

    setVerificationSuccess(true);
    setMfaCodeModalVisible(false);
    setIsModalVisible(false);
    form.resetFields();
    dispatch(setIsAccountDataUpdateNeeded(true));
  }, [putEmail.statusOk]);

  useEffect(() => {
    if (requestErrors && !isMfaCodeModalVisible) {
      setRequestErrors([]);
    }
  }, [isMfaCodeModalVisible]);

  const updateEmail = (code: string, id?: string): void => {
    const { email } = formValues;
    putEmail.triggerApi({
      newEmail: email,
      verificationId: id,
      verificationCode: code,
    });
  };

  const onFinish = (values: any): void => {
    setFormValue(values);
    setMfaCodeModalVisible(true);
  };

  const cancelMfa = (): void => {
    setMfaCodeModalVisible(false);
  };

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 24 },
      xl: { span: 24 },
    },
  };

  return (
    <>
      <CoreModal
        title={t("CHANGE_EMAIL")}
        centered
        visible={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        maskClosable={false}
      >
        <CoreForm
          {...formItemLayout}
          name="changeEmailForm"
          onFinish={onFinish}
          form={form}
          role={"editForm"}
        >
          <CoreForm.Item
            label={t("EMAIL")}
            name="email"
            validateTrigger="onBlur"
            rules={[
              {
                required: true,
                type: "email",
                message: t("EMAIL_ERROR"),
              },
            ]}
          >
            <Input
              onBlur={(value) => {
                form.setFieldsValue({
                  email: value.currentTarget.value.trim(),
                });
              }}
            />
          </CoreForm.Item>

          {putEmail.error && (
            <Row justify="center" align="middle" gutter={[32, 32]} role="error">
              <Col span={24}>
                <ErrorComponent
                  errors={putEmail.error.payload?.errors}
                  translationKey={"api-errors"}
                />
              </Col>
            </Row>
          )}
          <Row>
            <Col span={24}>
              <CoreButton
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={putEmail.isLoading}
                role={putEmail.isLoading ? "loading" : ""}
              >
                {t("UPDATE")}
              </CoreButton>
            </Col>
          </Row>
        </CoreForm>
      </CoreModal>
      <MfaModalComponent
        showModal={isMfaCodeModalVisible}
        onRequestWithVerification={updateEmail}
        onCancelVerification={cancelMfa}
        requestCode={true}
        verificationSuccess={isVerificationSuccess}
        requestErrors={requestErrors}
      />
    </>
  );
};

export { ChangeEmailModal };
