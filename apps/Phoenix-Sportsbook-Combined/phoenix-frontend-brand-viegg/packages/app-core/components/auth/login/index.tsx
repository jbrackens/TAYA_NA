import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import { Row, Col } from "antd";
import { useTranslation } from "i18n";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import {
  selectAuthModalVisible,
  hideAuthModal,
  showRegisterModal,
  showResetPasswordModal,
} from "../../../lib/slices/authSlice";
import {
  RememberMeLabel,
  ResetPasswordLink,
  LoginButton,
  RememberMeContainer,
  ErrorRow,
} from "./index.styled";
import {
  useLocalStorageVariables,
  JSONWebToken,
  PunterRoleEnum,
  ErrorsToBeHandledSpecially,
  useFingerprint,
} from "@phoenix-ui/utils";
import { showForgotPasswordModal } from "../../../lib/slices/authSlice";
import {
  StyledLink,
  BottomMessageNoLeftMargin,
} from "../../../components/modals/index.styled";
import jwt from "jsonwebtoken";
import { ErrorComponent } from "../../errors";
import { useQueryParams } from "@phoenix-ui/utils";
import { CoreButton } from "../../ui/button";
import { CoreModal } from "../../ui/modal";
import { CoreInput } from "../../ui/input";
import { StyledForm } from "../../ui/form/index.styled";
import { CoreSwitch } from "../../ui/switch";
import { CoreAlert } from "../../ui/alert";
import * as yup from "yup";
import { useLogin, useLoginWithVerification } from "../../../services/go-api";
import type { AppError } from "../../../services/go-api";

const LoginComponent: React.FC = () => {
  const { t } = useTranslation(["login", "responsible-gaming", "api-errors"]);
  const dispatch = useDispatch();
  const isAuthModalVisible = useSelector(selectAuthModalVisible);
  const loginMutation = useLogin();
  const loginWithVerificationMutation = useLoginWithVerification();
  const [isRoleErrorVisible, setIsRoleErrorVisible] = useState(false);
  const [mfaState, setMfaState] = useState<{
    isVisible: boolean;
    verificationId: string;
    username: string;
    password: string;
  }>({ isVisible: false, verificationId: "", username: "", password: "" });
  const [mfaCode, setMfaCode] = useState("");
  const fingerprintData = useFingerprint();
  const queryParams = useQueryParams();
  const {
    getAppUserName,
    saveAppUserName,
    clearAppUserName,
    getRememberMe,
    saveRememberMe,
    clearRememberMe,
  } = useLocalStorageVariables();

  const dispatchHideAuthModal = () => {
    dispatch(hideAuthModal());
    formik.resetForm();
    loginMutation.reset();
    loginWithVerificationMutation.reset();
    setIsRoleErrorVisible(false);
    setMfaState({ isVisible: false, verificationId: "", username: "", password: "" });
    setMfaCode("");
    queryParams.remove("showModal");
  };

  const dispatchShowForgotPasswordModal2 = () => {
    dispatchHideAuthModal();
    dispatch(showForgotPasswordModal());
  };

  const dispatchShowResetPasswordModal = () => {
    dispatchHideAuthModal();
    dispatch(showResetPasswordModal());
  };

  const hideLoginShowRegister = () => {
    dispatch(hideAuthModal());
    dispatch(showRegisterModal());
  };

  const validationSchema = yup.object().shape({
    username: yup.string().required(t("login:USERNAME_ERROR")),
    password: yup.string().required(t("login:PASSWORD_ERROR")),
  });

  const formik = useFormik({
    initialValues: {
      remember:
        typeof localStorage !== "undefined" ? getRememberMe() : false || false,
      username:
        (typeof localStorage !== "undefined" ? getAppUserName() : "") || "",
      password: "",
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      setIsRoleErrorVisible(false);

      loginMutation.mutate(
        {
          username: values.username || "",
          password: values.password || "",
          device_id: fingerprintData?.visitorId || undefined,
        },
        {
          onSuccess: (data) => {
            // MFA required — show verification modal
            if (data.type === "VERIFICATION_REQUESTED" || data.verificationId) {
              setMfaState({
                isVisible: true,
                verificationId: data.verificationId || "",
                username: values.username || "",
                password: values.password || "",
              });
              return;
            }

            // Check for admin role — block admin login on player app
            const decodedToken = jwt.decode(data.access_token, {
              json: true,
            }) as JSONWebToken;
            const tokenRoles = decodedToken?.realm_access?.roles || [];
            if (tokenRoles.includes(PunterRoleEnum.ADMIN)) {
              setIsRoleErrorVisible(true);
              return;
            }

            // Handle remember me
            if (values.remember) {
              saveRememberMe(true);
              saveAppUserName(values.username);
            } else {
              clearRememberMe();
              clearAppUserName();
            }

            dispatchHideAuthModal();
          },
        },
      );
    },
  });

  // Extract error from mutation for display
  const loginError = loginMutation.error as AppError | undefined;

  const handleLoginSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    void formik.submitForm();
  };

  return (
    <>
      <CoreModal
        title={t("login:HEADER")}
        centered
        visible={isAuthModalVisible}
        onOk={dispatchHideAuthModal}
        onCancel={dispatchHideAuthModal}
        footer={null}
        maskClosable={false}
      >
        <StyledForm onSubmit={handleLoginSubmit}>
          <CoreInput
            id="username"
            value={formik.values.username}
            onChange={formik.handleChange}
            errorText={formik.errors.username}
            isErrorVisible={
              formik.touched.username && Boolean(formik.errors.username)
            }
            label={t("login:USERNAME")}
            spaceUnder
          />
          <CoreInput.Password
            id="password"
            value={formik.values.password}
            onChange={formik.handleChange}
            errorText={formik.errors.password}
            isErrorVisible={
              formik.touched.password && Boolean(formik.errors.password)
            }
            label={t("login:PASSWORD")}
            spaceUnder
          />
          <RememberMeContainer>
            <CoreSwitch
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<CloseOutlined />}
              size="small"
            />
            <RememberMeLabel>{t("login:REMEMBER_ME")}</RememberMeLabel>
            <StyledLink onClick={() => dispatchShowForgotPasswordModal2()}>
              {t("login:FORGOT_PASSWORD")}
            </StyledLink>
          </RememberMeContainer>
          {loginError && (
            <ErrorRow
              justify="center"
              align="middle"
              gutter={[32, 32]}
              role="error"
            >
              <Col span={24}>
                {loginError.payload?.errors.map(
                  (
                    error: { details: string; errorCode: string },
                    i: number,
                  ) => {
                    return (
                      <CoreAlert
                        key={i}
                        message={
                          error.errorCode ===
                            ErrorsToBeHandledSpecially.PUNTER_SHOULDRESET_PASSWORD ||
                          error.errorCode ===
                            ErrorsToBeHandledSpecially.UNAUTHORISED_RESPONSE_REQUIRING_PASSWORD_RESET ? (
                            <>
                              {t(`api-errors:${error.errorCode}`)}
                              <ResetPasswordLink
                                onClick={() => dispatchShowResetPasswordModal()}
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
                  },
                )}
              </Col>
            </ErrorRow>
          )}

          {isRoleErrorVisible && (
            <ErrorRow
              justify="center"
              align="middle"
              gutter={[32, 32]}
              role="error"
            >
              <Col span={24}>
                <ErrorComponent
                  errors={[{ errorCode: "ERROR_NOT_ELIGIBLE" }]}
                  translationKey={"login"}
                />
              </Col>
            </ErrorRow>
          )}
          <LoginButton
            type="primary"
            htmlType="button"
            size="large"
            block
            loading={loginMutation.isLoading}
            role={loginMutation.isLoading ? "loading" : ""}
            onClick={() => void formik.submitForm()}
          >
            {t("login:SIGN_IN")}
          </LoginButton>
          <Row justify="center" align="middle">
            <CoreButton
              type="default"
              onClick={hideLoginShowRegister}
              size="large"
              block
            >
              {t("login:SIGN_UP")}
            </CoreButton>
          </Row>
          <BottomMessageNoLeftMargin>
            {t("responsible-gaming:CALL_GAMBLER")}
          </BottomMessageNoLeftMargin>
        </StyledForm>
      </CoreModal>
      <CoreModal
        title={t("login:MFA_TITLE", "Verification Required")}
        centered
        visible={mfaState.isVisible}
        onCancel={() =>
          setMfaState({ isVisible: false, verificationId: "", username: "", password: "" })
        }
        footer={null}
        maskClosable={false}
      >
        <StyledForm
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            loginWithVerificationMutation.mutate(
              {
                username: mfaState.username,
                password: mfaState.password,
                verification_id: mfaState.verificationId,
                verification_code: mfaCode,
                device_id: fingerprintData?.visitorId || undefined,
              },
              {
                onSuccess: () => {
                  // Handle remember me
                  if (formik.values.remember) {
                    saveRememberMe(true);
                    saveAppUserName(formik.values.username);
                  } else {
                    clearRememberMe();
                    clearAppUserName();
                  }
                  setMfaState({ isVisible: false, verificationId: "", username: "", password: "" });
                  setMfaCode("");
                  dispatchHideAuthModal();
                },
              },
            );
          }}
        >
          <CoreInput
            id="mfaCode"
            value={mfaCode}
            onChange={(e) => setMfaCode((e.currentTarget as HTMLInputElement).value)}
            label={t("login:MFA_CODE_LABEL", "Verification Code")}
            spaceUnder
          />
          {loginWithVerificationMutation.error && (
            <ErrorRow justify="center" align="middle" gutter={[32, 32]} role="error">
              <Col span={24}>
                <CoreAlert
                  message={t("login:MFA_ERROR", "Invalid verification code. Please try again.")}
                  type="error"
                  showIcon
                />
              </Col>
            </ErrorRow>
          )}
          <LoginButton
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loginWithVerificationMutation.isLoading}
          >
            {t("login:MFA_SUBMIT", "Verify")}
          </LoginButton>
        </StyledForm>
      </CoreModal>
    </>
  );
};

export { LoginComponent };
