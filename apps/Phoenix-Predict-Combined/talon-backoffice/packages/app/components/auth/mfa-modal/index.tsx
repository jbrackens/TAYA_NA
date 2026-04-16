import React, { useEffect, useState } from "react";
import { Row, Col } from "antd";
import { useTranslation } from "i18n";
import { useApi } from "../../../services/api/api-service";
import { CancelButton, ErrorRow, MessageContainer } from "./index.styled";
import { useSpy, ErrorsToBeHandledSpecially } from "@phoenix-ui/utils";
import { ResetPasswordLink } from "../login/index.styled";
import { useDispatch } from "react-redux";
import { showResetPasswordModal } from "../../../lib/slices/authSlice";
import { CoreModal } from "../../ui/modal";
import { CoreForm } from "../../ui/form";
import { InputsContainer } from "../../ui/form/index.styled";
import { CoreAlert } from "../../ui/alert";
import { CodeInput } from "../../code-input";
import { CoreSpin } from "../../ui/spin";

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
  const { t } = useTranslation(["mfa", "api-errors"]);
  const [isMfaCodeModalVisible, setMfaCodeModalVisible] = useState(showModal);
  const [isProcessingVerification, setProcessingVerification] = useState(false);
  const [requestNewCode, setRequestNewCode] = useState(false);
  const [verificationId, setVerificationId] = useState<string>("");
  const requestUrl =
    verificationCode && verificationCode?.length > 0
      ? `/verification/request-by-verification-code/${verificationCode}`
      : "verification/request";
  const requestVerificationCode = useApi(requestUrl, "POST");
  const [form] = CoreForm.useForm();
  const { spy } = useSpy();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isMfaCodeModalVisible || !requestNewCode) return;
    requestVerificationCode.triggerApi();
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
    if (!requestVerificationCode.statusOk) return;
    const data = requestVerificationCode.data;
    setVerificationId(data.verificationId);
  }, [requestVerificationCode.statusOk]);

  useEffect(() => {
    resetMfaModal();
  }, [verificationSuccess]);

  spy(requestErrors, () => setProcessingVerification(false));

  const resetMfaModal = () => {
    setMfaCodeModalVisible(false);
    setProcessingVerification(false);
    setRequestNewCode(false);
    onCancelVerification();
    requestVerificationCode.resetHookState();
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
    dispatch(showResetPasswordModal());
  };

  const onInputChange = (val: string) => {
    form.setFieldsValue({ code: val });
    if (form.getFieldValue("code").length === 6) {
      setProcessingVerification(true);
      onRequestWithVerification(form.getFieldValue("code"), verificationId);
    }
  };

  return (
    <>
      <CoreModal
        title={t("MODAL_TITLE")}
        centered
        visible={isMfaCodeModalVisible}
        onOk={resetMfaModal}
        onCancel={resetMfaModal}
        footer={null}
        maskClosable={false}
      >
        <CoreForm {...formItemLayout} name="mfaForm" form={form}>
          <InputsContainer>
            <CoreForm.Item
              label={t("MODAL_CODE")}
              name="code"
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
              <CoreSpin
                spinning={
                  requestVerificationCode.isLoading || isProcessingVerification
                }
              >
                <CodeInput
                  name="code"
                  inputMode="numeric"
                  type="number"
                  fields={6}
                  onChange={onInputChange}
                />
              </CoreSpin>
            </CoreForm.Item>
          </InputsContainer>
          {(requestVerificationCode.isLoading ||
            requestVerificationCode.error) && (
            <Row
              justify="center"
              align="middle"
              gutter={[32, 32]}
              role={requestVerificationCode.isLoading ? "loading" : "error"}
            >
              {requestVerificationCode.error && (
                <Col span={24}>
                  <CoreAlert message={t("MODAL_ERROR")} type="error" showIcon />
                </Col>
              )}
            </Row>
          )}

          {requestErrors && (
            <ErrorRow justify="center" align="middle" gutter={[32, 32]}>
              {requestErrors.map((error: { errorCode: string }, i: number) => {
                return (
                  <CoreAlert
                    key={i}
                    message={
                      error.errorCode ===
                        ErrorsToBeHandledSpecially.PUNTER_SHOULDRESET_PASSWORD ||
                      error.errorCode ===
                        ErrorsToBeHandledSpecially.INCORRECT_MFA_VERIFICATION_WITH_PASSWORDRESET ||
                      error.errorCode ===
                        ErrorsToBeHandledSpecially.UNAUTHORISED_RESPONSE_REQUIRING_PASSWORD_RESET ? (
                        <>
                          {t(`api-errors:${error.errorCode}`)}
                          <ResetPasswordLink
                            onClick={dispatchShowResetPasswordModal}
                          >
                            {t("login:RESET_PASSWORD_LINK")}
                          </ResetPasswordLink>
                        </>
                      ) : (
                        t(`api-errors:${error.errorCode}`)
                      )
                    }
                    type="error"
                    showIcon
                  />
                );
              })}
            </ErrorRow>
          )}
          {!requestErrors?.length && (
            <MessageContainer>{t("MFA_MESSAGE")}</MessageContainer>
          )}
          <CoreForm.Item>
            <CancelButton
              type="default"
              size="large"
              block
              onClick={resetMfaModal}
            >
              {t("MODAL_CANCEL")}
            </CancelButton>
          </CoreForm.Item>
        </CoreForm>
      </CoreModal>
    </>
  );
};

export { MfaModalComponent };
