import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Input, Row, Col } from "antd";
import { useTranslation } from "i18n";
import { setIsAccountDataUpdateNeeded } from "../../../../lib/slices/settingsSlice";
import { ErrorComponent } from "../../../errors";
import { CoreButton } from "../../../ui/button";
import { CoreModal } from "../../../ui/modal";
import { CoreForm } from "../../../ui/form";
import { useUpdateProfile } from "../../../../services/go-api";
import type { AppError } from "../../../../services/go-api";

type ChangeEmailModalProps = {
  isModalVisible: boolean;
  setIsModalVisible: (isVisible: boolean) => void;
};

const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  isModalVisible,
  setIsModalVisible,
}) => {
  const { t } = useTranslation(["personal-details"]);
  const dispatch = useDispatch();
  const [form] = CoreForm.useForm();
  const updateMutation = useUpdateProfile();

  useEffect(() => {
    if (!isModalVisible) {
      form.resetFields();
      updateMutation.reset();
    }
  }, [isModalVisible]);

  const onFinish = (values: any): void => {
    updateMutation.reset();
    // Go backend: PUT /profile/email with email field.
    updateMutation.mutate(
      { email: values.email },
      {
        onSuccess: () => {
          setIsModalVisible(false);
          form.resetFields();
          dispatch(setIsAccountDataUpdateNeeded(true));
        },
      },
    );
  };

  const updateError = updateMutation.error as AppError | undefined;

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 24 },
      xl: { span: 24 },
    },
  };

  return (
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

        {updateError && (
          <Row justify="center" align="middle" gutter={[32, 32]} role="error">
            <Col span={24}>
              <ErrorComponent
                errors={updateError.payload?.errors}
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
              loading={updateMutation.isLoading}
              role={updateMutation.isLoading ? "loading" : ""}
            >
              {t("UPDATE")}
            </CoreButton>
          </Col>
        </Row>
      </CoreForm>
    </CoreModal>
  );
};

export { ChangeEmailModal };
