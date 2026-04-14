import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import { Row, Col } from "antd";
import { useTranslation } from "i18n";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import {
  selectAuthModalVisible,
  hideAuthModal,
  logIn,
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
import { useApi } from "../../../services/api/api-service";
import {
  useToken,
  appendSecondsToTimestamp,
  useLocalStorageVariables,
  JSONWebToken,
  PunterRoleEnum,
  ErrorsToBeHandledSpecially,
  useFingerprint,
} from "@phoenix-ui/utils";
import { showForgotPasswordModal } from "../../../lib/slices/authSlice";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import {
  StyledLink,
  BottomMessageNoLeftMargin,
} from "../../../components/modals/index.styled";
import { MfaModalComponent } from "../mfa-modal";
import { useRef } from "react";
import { SESSION_ID_KEY } from "../../../hooks/useLogout";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";
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

dayjs.extend(LocalizedFormat);

type FormValues = {
  password: string | undefined;
  username: string | undefined;
  remember: boolean | null;
};

interface LoginResponseToken {
  token: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  userId: string;
}

interface LoginResponse {
  token: LoginResponseToken;
  hasToAcceptTerms: boolean;
  lastSignIn?: string;
  sessionId: string;
  type?: string;
  verificationId?: string;
}

const LoginComponent: React.FC = () => {
  const { t } = useTranslation(["login", "responsible-gaming", "api-errors"]);
  const dispatch = useDispatch();
  const [formValues, setFormValue] = useState<FormValues>({
    remember: false,
  } as FormValues);
  const [formFinished, setFormFinished] = useState(false);
  const isAuthModalVisible = useSelector(selectAuthModalVisible);
  const useLogin = useApi("login", "POST");
  const useLoginWithVerification = useApi("login-with-verification", "POST");
  const [
    loginWithVerificationErrors,
    setLoginWithVerificationErrors,
  ] = useState<Array<{ errorCode: string }>>();
  const { saveToken, saveTokenExpDate, saveUserId } = useToken();
  const [isMfaCodeModalVisible, setMfaCodeModalVisible] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isVerificationSuccess, setVerificationSuccess] = useState(false);
  const [lastLogin, setLastLogin] = useState<string>();
  const hasToAcceptTerms = useRef(false);
  const queryParams = useQueryParams();
  const {
    getAppUserName,
    saveAppUserName,
    clearAppUserName,
    getRememberMe,
    saveRememberMe,
    clearRememberMe,
  } = useLocalStorageVariables();

  const loginWithVerification = async (verificationCode: string) => {
    useLoginWithVerification.resetHookState();
    if (verificationCode) {
      const { username, password } = formValues;
      useLoginWithVerification.triggerApi({
        password,
        username,
        verificationId: verificationId,
        verificationCode: verificationCode,
        deviceFingerprint: fingerprintData,
      });
      setFormFinished(false);
    }
  };

  const [isRoleErrorVisible, setIsRoleErrorVisible] = useState(false);

  const fingerprintData = useFingerprint();

  const dispatchHideAuthModal = () => {
    dispatch(hideAuthModal());
    formik.resetForm();
    useLogin.resetHookState();
    setIsRoleErrorVisible(false);
    queryParams.remove("showModal");
  };

  const lastLoginOnOk = () => {
    setLastLogin("");
    // dispatch login event after last login modal has closed to prevent terms modal overlap
    dispatch(logIn());
  };

  const login = (data: LoginResponse) => {
    setIsRoleErrorVisible(false);
    const now = dayjs().valueOf();
    const token = data.token;
    const decodedToken = jwt.decode(token.token, {
      json: true,
    }) as JSONWebToken;
    const tokenRoles = decodedToken?.realm_access?.roles || [];
    if (tokenRoles.includes(PunterRoleEnum.ADMIN)) {
      setIsRoleErrorVisible(true);
      return;
    }

    hasToAcceptTerms.current = data.hasToAcceptTerms;

    saveToken(token.token, token.refreshToken);
    saveTokenExpDate(
      appendSecondsToTimestamp(token.expiresIn, now),
      appendSecondsToTimestamp(token.refreshExpiresIn, now),
    );
    saveUserId(token.userId);

    if (data.lastSignIn) {
      setLastLogin(data.lastSignIn);
    } else {
      dispatch(logIn());
    }

    dispatchHideAuthModal();

    sessionStorage.setItem(SESSION_ID_KEY, data.sessionId);
  };

  useEffect(() => {
    if (!useLogin.statusOk) return;

    const data = useLogin.data;

    if (data?.type === "VERIFICATION_REQUESTED") {
      setVerificationId(data.verificationId);
      dispatchHideAuthModal();
      setMfaCodeModalVisible(true);
      return;
    }

    login(data);
  }, [useLogin.statusOk]);

  useEffect(() => {
    if (!useLoginWithVerification.statusOk) {
      setLoginWithVerificationErrors(
        useLoginWithVerification.error?.payload?.errors,
      );
      return;
    }

    setLoginWithVerificationErrors([]);
    const data = useLoginWithVerification.data;
    setVerificationSuccess(true);
    setMfaCodeModalVisible(false);
    login(data);
  }, [useLoginWithVerification.statusOk]);

  useEffect(() => {
    if (loginWithVerificationErrors && !isMfaCodeModalVisible) {
      setLoginWithVerificationErrors([]);
    }
  }, [isMfaCodeModalVisible]);

  const dispatchShowForgotPasswordModal = () => {
    dispatchHideAuthModal();
    dispatch(showForgotPasswordModal());
  };

  const dispatchShowResetPasswordModal = () => {
    dispatchHideAuthModal();
    dispatch(showResetPasswordModal());
  };

  const onFinish = (values: FormValues): void => {
    setFormValue(values);
    setFormFinished(true);
  };

  useEffect(() => {
    if (formFinished) {
      setIsRoleErrorVisible(false);
      const proceedSubmitRequest = async () => {
        const { username, password, remember } = formValues;
        useLogin.triggerApi({
          password,
          username: username,
          deviceFingerprint: fingerprintData,
        });
        if (remember) {
          saveRememberMe(true);
          saveAppUserName(username);
        }
        if (!remember) {
          clearRememberMe();
          clearAppUserName();
        }
      };
      proceedSubmitRequest();
      setFormFinished(false);
    }
  }, [formFinished]);

  const cancelMfa = (): void => {
    setMfaCodeModalVisible(false);
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
      onFinish(values);
    },
  });

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
        <StyledForm onSubmit={formik.handleSubmit}>
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
            <StyledLink onClick={() => dispatchShowForgotPasswordModal()}>
              {t("login:FORGOT_PASSWORD")}
            </StyledLink>
          </RememberMeContainer>
          {useLogin.error && (
            <ErrorRow
              justify="center"
              align="middle"
              gutter={[32, 32]}
              role="error"
            >
              <Col span={24}>
                {useLogin.error.payload?.errors.map(
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
            htmlType="submit"
            size="large"
            block
            loading={useLogin.isLoading}
            role={useLogin.isLoading ? "loading" : ""}
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
      <MfaModalComponent
        showModal={isMfaCodeModalVisible}
        onRequestWithVerification={loginWithVerification}
        onCancelVerification={cancelMfa}
        requestCode={false}
        verificationSuccess={isVerificationSuccess}
        requestErrors={loginWithVerificationErrors}
      />
      <ResultModalComponent
        status={StatusEnum.INFO}
        title={t("login:LAST_LOGIN")}
        subTitle={
          <>
            <p>{dayjs(lastLogin).format("LLLL")}</p>
            <p>{t("responsible-gaming:CALL_GAMBLER")}</p>
          </>
        }
        onOk={lastLoginOnOk}
        okText={t("OK")}
        isVisible={lastLogin?.length ? true : false}
      />
    </>
  );
};

export { LoginComponent };
