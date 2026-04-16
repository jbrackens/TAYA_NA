import React, { useEffect, useState } from "react";
import { Col, Alert, Modal, Form, Input, Button } from "antd";
import { useTranslation } from "i18n";
import { useSpy, ErrorsToBeHandledSpecially, Method } from "@phoenix-ui/utils";
import { useApi } from "../../../services/api/api-service";
import { ErrorRow } from "./index.styled";

type MfaModalComponentProps = {
  showModal: boolean;
  onRequestWithVerification: (code: string, id?: string) => void;
  onCancelVerification: () => void;
  requestCode: boolean;
  verificationSuccess: boolean;
  requestErrors?: Array<{ errorCode: string }>;
  verificationCode?: string;
};

const MfaModalComponent: React.FC<MfaModalComponentProps> = ({
  showModal,
  onRequestWithVerification,
  onCancelVerification,
  requestCode,
  verificationSuccess,
  requestErrors,
  verificationCode,
}) => {
  const { t } = useTranslation(["mfa", "error"]);
  const [isMfaCodeModalVisible, setMfaCodeModalVisible] = useState(showModal);
  const [isProcessingVerification, setProcessingVerification] = useState(false);
  const [requestNewCode, setRequestNewCode] = useState(false);
  const [verificationId, setVerificationId] = useState<string>("");
  const requestUrl =
    verificationCode && verificationCode?.length > 0
      ? `/verification/request-by-verification-code/${verificationCode}`
      : "verification/request";
  const [
    triggerApi,
    isLoading,
    response,
    _triggerRefresh,
    resetHookState,
  ] = useApi(requestUrl, Method.POST);
  const [form] = Form.useForm();
  const { spy } = useSpy();

  useEffect(() => {
    if (!isMfaCodeModalVisible || !requestNewCode) return;
    triggerApi();
    setRequestNewCode(false);
  }, [requestNewCode]);

  useEffect(() => {
    setMfaCodeModalVisible(showModal);
    if (isMfaCodeModalVisible && requestCode) {
      setRequestNewCode(true);
    }

    if (!showModal) {
      resetMfaModal();
    }
  }, [showModal]);

  useEffect(() => {
    if (isMfaCodeModalVisible && requestCode) {
      setRequestNewCode(true);
    }
  }, [isMfaCodeModalVisible]);

  useEffect(() => {
    if (!response.succeeded) return;
    const data = response.data;
    setVerificationId(data?.verificationId);
  }, [response.succeeded]);

  useEffect(() => {
    resetMfaModal();
  }, [verificationSuccess]);

  spy(requestErrors, () => setProcessingVerification(false));

  const onFinish = (values: any): void => {
    setProcessingVerification(true);
    onRequestWithVerification(values.code, verificationId);
  };

  const resetMfaModal = () => {
    setMfaCodeModalVisible(false);
    setProcessingVerification(false);
    setRequestNewCode(false);
    onCancelVerification();
    resetHookState();
    form.resetFields();
  };

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 24 },
      xl: { span: 24 },
    },
  };

  const dispatchShowResetPasswordModal = () => {
    resetMfaModal();
  };

  return (
    <>
      <Modal
        title={t("MODAL_TITLE")}
        centered
        visible={isMfaCodeModalVisible}
        onOk={resetMfaModal}
        onCancel={resetMfaModal}
        footer={null}
        maskClosable={false}
      >
        <Form
          {...formItemLayout}
          name="mfaForm"
          onFinish={onFinish}
          form={form}
        >
          <>
            <Form.Item
              label={t("MODAL_CODE")}
              name="code"
              validateTrigger={["onBlur"]}
              rules={[
                {
                  required: true,
                  message: t("MODAL_CODE_REQUIRED"),
                },
                {
                  pattern: new RegExp(/^[0-9]*$/),
                  min: 6,
                  max: 6,
                  message: t("MODAL_CODE_LENGTH_ERROR"),
                },
              ]}
            >
              <Input
                onBlur={(value) => {
                  form.setFieldsValue({
                    code: value.currentTarget.value.trim(),
                  });
                }}
              />
            </Form.Item>
          </>
          {(isLoading || response.error) && (
            <ErrorRow
              justify="center"
              align="middle"
              role={isLoading ? "loading" : "error"}
            >
              {response.error && (
                <Col span={24}>
                  <Alert message={t("MODAL_ERROR")} type="error" showIcon />
                </Col>
              )}
            </ErrorRow>
          )}

          {requestErrors && (
            <ErrorRow justify="center" align="middle">
              {requestErrors.map((error: { errorCode: string }, i: number) => {
                return (
                  <Alert
                    key={i}
                    message={
                      error.errorCode ===
                        ErrorsToBeHandledSpecially.PUNTER_SHOULDRESET_PASSWORD ||
                      error.errorCode ===
                        ErrorsToBeHandledSpecially.INCORRECT_MFA_VERIFICATION_WITH_PASSWORDRESET ||
                      error.errorCode ===
                        ErrorsToBeHandledSpecially.UNAUTHORISED_RESPONSE_REQUIRING_PASSWORD_RESET ? (
                        <>
                          {t(`error:${error.errorCode}`)}
                          <Button
                            type="link"
                            onClick={dispatchShowResetPasswordModal}
                          >
                            {t("login:RESET_PASSWORD_LINK")}
                          </Button>
                        </>
                      ) : (
                        t(`error:${error.errorCode}`)
                      )
                    }
                    type="error"
                    showIcon
                  />
                );
              })}
            </ErrorRow>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isLoading || isProcessingVerification}
              block
            >
              {t("MODAL_SUBMIT")}
            </Button>
          </Form.Item>
          <Form.Item>
            <Button type="default" size="large" block onClick={resetMfaModal}>
              {t("MODAL_CANCEL")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export { MfaModalComponent };
