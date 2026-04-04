import React, { FC, useEffect, useState } from "react";
import { Formik, Field, Form } from "formik";
import Router from "next/router";
import { Input, Button, Header, Link, Modal, message } from "ui";
import {
  LoginFormWrapper,
  LoginButtonGroup,
  FieldWrapper,
  Text,
  OrDiv,
  HrDiv,
  OrDivContent,
  OtherButtonGroup,
  ButtonWithMarginBottom,
} from "./../index.styled";
import { useTranslation } from "next-export-i18n";
import {
  buildSocialAuthUrl,
  getParameterById,
  createTokenPayload,
  useToken,
  appendSecondsToTimestamp,
} from "utils";
import { useApi } from "../../../../services/api-service";
import { useDispatch } from "react-redux";
import { logIn } from "../../../../lib/slices/authSlice";
import * as yup from "yup";
import dayjs from "dayjs";

enum TokenApiDetails {
  URL = "auth/realms/waysun-test-1/protocol/openid-connect/token",
  METHOD = "POST",
}

enum GeneralLoginApiDetails {
  URL = "ipm/login",
  METHOD = "POST",
}

type LoginValues = {
  realmId?: string;
  username?: string;
  password?: string;
};
type Passwordreset = {
  email?: string;
};

type LoginFormProps = {
  newUser: () => void;
};

const LoginForm: FC<LoginFormProps> = ({ newUser }) => {
  const { t } = useTranslation();
  const { saveToken, saveTokenExpDate } = useToken();
  const [displayPasswordModal, setDisplayPasswordModal] = useState(false);
  const [loginGoogleLoading, setLoginGoogleLoading] = useState(false);
  const [loginFacebookLoading, setLoginFacebookLoading] = useState(false);
  const dispatch = useDispatch();
  const realmIdFromParam = String(Router.query.realm_id);
  const getTokenApi: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    statusOk?: boolean;
  } = useApi(TokenApiDetails.URL, TokenApiDetails.METHOD);

  const generalLogin: {
    data: any;
    triggerApi: any;
    error: any;
    isLoading: boolean;
    resetHookState: any;
    statusOk?: boolean;
  } = useApi(GeneralLoginApiDetails.URL, GeneralLoginApiDetails.METHOD);

  useEffect(() => {
    const responseState = getParameterById("state");
    if (responseState) {
      setLoginGoogleLoading(true);
      const dataToSend = createTokenPayload();
      getTokenApi.triggerApi(
        dataToSend,
        {},
        { "Content-Type": "application/x-www-form-urlencoded" },
      );
    }
  }, []);
  useEffect(() => {
    if (getTokenApi.statusOk) {
      const { data } = getTokenApi;
      const now = dayjs().valueOf();
      saveToken(data.access_token, data.refresh_token);
      saveTokenExpDate(
        appendSecondsToTimestamp(data.expires_in, now),
        appendSecondsToTimestamp(data.refresh_expires_in, now),
      );
      Router.push("/");
      dispatch(logIn());
    }
  }, [getTokenApi.statusOk]);
  useEffect(() => {
    if (generalLogin.statusOk) {
      const { data } = generalLogin;
      if (data.status === "ok") {
        const now = dayjs().valueOf();
        saveToken(data.details?.id_token, data.details?.refresh_token);
        saveTokenExpDate(
          appendSecondsToTimestamp(data.details?.expires_in, now),
          appendSecondsToTimestamp(data.details?.refresh_expires_in, now),
        );
        Router.push("/");
        dispatch(logIn());
      }
    }
  }, [generalLogin.statusOk]);
  useEffect(() => {
    if (generalLogin.error) {
      message.error(t(generalLogin.error?.payload?.details?.errorMessage));
      generalLogin.resetHookState();
    }
  }, [generalLogin.error]);
  const signInHandler = (values: LoginValues) => {
    generalLogin.triggerApi({
      realm_id: values.realmId,
      username: values.username,
      password: values.password,
    });
  };
  const changePasswordHandler = (values: Passwordreset) => {
    // Change password logic here
  };
  const validationLoginSchema = yup.object().shape({
    realmId: yup
      .number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .required(t("ACCID_ERR_REQUIRED")),
    username: yup
      .string()
      .required(t("USERNAME_ERR_REQUIRED"))
      .email(t("USERNAME_ERR_EMAIL")),
    password: yup.string().required(t("PASSWORD_ERR_REQUIRED")),
  });
  const validateChangePassword = ({ email }: Passwordreset) => {
    const errors: Passwordreset = {};
    if (!email) {
      errors.email = t("EMAIL_ERR_REQUIRED");
    }
    return errors;
  };
  const loginWithSocial = (loginWith: "google" | "facebook") => {
    loginWith === "google"
      ? setLoginGoogleLoading(true)
      : setLoginFacebookLoading(true);
    const redirectUrl = buildSocialAuthUrl(loginWith);
    window.location.href = redirectUrl;
  };
  return (
    <LoginFormWrapper>
      <Header>{t("LOGIN_MAIN_HEADER")}</Header>
      <Header variation="secondary" size="small" type="h5">
        {t("LOGIN_SEC_HEADER")}
      </Header>
      <Formik
        enableReinitialize
        initialValues={{
          realmId: realmIdFromParam ? realmIdFromParam : "",
          username: "",
          password: "",
        }}
        validationSchema={validationLoginSchema}
        onSubmit={signInHandler}
      >
        {({ errors, touched }) => (
          <Form>
            <FieldWrapper>
              <Field
                labelText={t("REALM_ID_LABEL")}
                id="realmId"
                name="realmId"
                as={Input}
                type="number"
                fullWidth
                error={errors.realmId && touched.realmId ? errors.realmId : ""}
              />
            </FieldWrapper>
            <FieldWrapper>
              <Field
                labelText={t("USERNAME_LABEL")}
                id="username"
                name="username"
                as={Input}
                type="string"
                fullWidth
                error={
                  errors.username && touched.username ? errors.username : ""
                }
              />
            </FieldWrapper>
            <FieldWrapper>
              <Field
                id="password"
                name="password"
                type="password"
                as={Input}
                labelText={t("PASSWORD_LABEL")}
                fullWidth
                error={
                  errors.password && touched.password ? errors.password : ""
                }
              />
            </FieldWrapper>
            <LoginButtonGroup>
              <Button type="submit" fullWidth loading={generalLogin.isLoading}>
                {t("SUBMIT_BUTTON_TEXT")}
              </Button>
              <Link fullWidth onClick={() => setDisplayPasswordModal(true)}>
                {t("FORGOT_PASS_TEXT")}
              </Link>
            </LoginButtonGroup>
          </Form>
        )}
      </Formik>
      <OrDiv>
        <HrDiv></HrDiv>
        <OrDivContent>{t("OTHER_OPTION_TEXT")}</OrDivContent>
        <HrDiv></HrDiv>
      </OrDiv>
      <OtherButtonGroup>
        <ButtonWithMarginBottom
          fullWidth
          onClick={newUser}
          loading={loginGoogleLoading}
          buttonType="blue-outline"
        >
          {t("REGISTER")}
        </ButtonWithMarginBottom>
        {/* <ButtonWithMarginBottom
          fullWidth
          onClick={() => loginWithSocial("google")}
          loading={loginGoogleLoading}
          buttonType="secondary"
        >
          {t("LOGIN_GOOGLE")}
        </ButtonWithMarginBottom>
        <ButtonWithMarginBottom
          fullWidth
          onClick={() => loginWithSocial("facebook")}
          loading={loginFacebookLoading}
          buttonType="secondary"
        >
          {t("LOGIN_FACEBOOK")}
        </ButtonWithMarginBottom> */}
      </OtherButtonGroup>
      <Modal
        display={displayPasswordModal}
        modalheader={t("FORGOT_PASS_MODAL_HEADING")}
        onCloseButtonClicked={() => {
          setDisplayPasswordModal(false);
        }}
      >
        <Formik
          initialValues={{
            email: "",
          }}
          validate={validateChangePassword}
          onSubmit={changePasswordHandler}
        >
          {({ errors, touched }) => (
            <Form>
              <Text>{t("MODAL_HELP_TEXT")}</Text>
              <Field
                labelText={t("MODAL_EMAIL_LABEL")}
                id="email"
                name="email"
                as={Input}
                fullWidth
                error={errors.email && touched.email ? errors.email : ""}
              />
              <LoginButtonGroup>
                <Button type="submit" fullWidth>
                  {t("MODAL_BUTTON_TEXT")}
                </Button>
              </LoginButtonGroup>
            </Form>
          )}
        </Formik>
      </Modal>
    </LoginFormWrapper>
  );
};

export default LoginForm;
