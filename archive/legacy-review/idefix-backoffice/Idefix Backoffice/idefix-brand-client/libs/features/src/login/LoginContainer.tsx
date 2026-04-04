import * as React from "react";
import { FormattedMessage } from "react-intl";
import { ApiContext } from "@brandserver-client/api";
import { LoginResponse, LoginRestriction } from "@brandserver-client/types";
import Login from "./Login";
import ResetPassword from "./ResetPassword";
import { useRouter } from "next/router";
import { getPageOptions } from "@brandserver-client/lobby";
import { useSelector } from "react-redux";

const DEFAULT_SUBTITLE = <FormattedMessage id="login.subtitle" />;
const SESSION_DIED_SUBTITLE = <FormattedMessage id="login.session-died" />;
const UNSUBSCRIBE_SUBTITLE = <FormattedMessage id="unsubscribe.heading" />;

const initialRestriction: LoginRestriction = {
  restrictionActive: false,
  content: "",
  showRestrictionRequest: false,
  exclusionKey: "",
  expires: "",
  permanent: false
};

// TODO: fix types + refactor

const LoginContainer = () => {
  const pageOptions = useSelector(getPageOptions);

  if (!pageOptions || !pageOptions.formData || !pageOptions.config) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const api = React.useContext(ApiContext);

  const {
    query: {
      lang: language,
      login,
      loginAgain,
      forgot,
      email: emailFromQuery,
      unsubscribe
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
  } = useRouter();

  const countryISO =
    (pageOptions.formData.country && pageOptions.formData.country.CountryISO) ||
    pageOptions.formData.countries[0].CountryISO;
  const phoneCodes = {
    active: pageOptions.formData.phoneCountry
      ? pageOptions.formData.phoneCountry.code
      : undefined,
    all: pageOptions.formData.phoneRegions.map(region => region.code)
  };

  const showPhoneLogin = pageOptions.config.showPhoneLogin;
  const token = pageOptions.config.liveChatToken;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    if (!login && !loginAgain && !forgot)
      setTimeout(() => {
        setRestriction(initialRestriction);
      }, 500);
  }, [login, loginAgain, forgot]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [restriction, setRestriction] = React.useState(initialRestriction);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [phoneMask, setPhoneMask] = React.useState<string>("");
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [email, setEmail] = React.useState<string>("");
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleLoginResponse = React.useCallback(
    (response: LoginResponse) => {
      const {
        restrictionActive,
        content,
        showRestrictionRequest,
        exclusionKey,
        expires,
        nextUrl,
        deposits
      } = response;
      if (restrictionActive) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return setRestriction({
          restrictionActive,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          content,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          showRestrictionRequest,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          exclusionKey,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          expires
        });
      }

      if (unsubscribe) {
        return (window.top!.location.href = "/loggedin/myaccount/subscription");
      }

      if (nextUrl) {
        return (window.top!.location.href = nextUrl);
      }

      if (!deposits) {
        return (window.top!.location.href = "/loggedin/myaccount/deposit");
      }

      return (window.top!.location.href = "/loggedin");
    },
    [unsubscribe]
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleEmailLogin = React.useCallback(
    (email: string, password: string) =>
      api.auth.login(language as string, {
        email,
        password,
        language: language as string,
        tz: new Date().getTimezoneOffset(),
        token
      }),
    [language, token]
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleRemoveSelfExclusion = React.useCallback(
    async (exclusionKey: string) => {
      try {
        const { restrictionActive, content, showRestrictionRequest } =
          await api.selfExclusion.remove({
            exclusionKey,
            language: language as string,
            tz: new Date().getTimezoneOffset()
          });

        if (!restrictionActive) {
          return setRestriction({
            ...initialRestriction,
            restrictionActive: true
          });
        }

        setRestriction({
          ...initialRestriction,
          content,
          showRestrictionRequest,
          restrictionActive: true
        });
      } catch (error) {
        console.log(error, "error");
      }
    },
    [language]
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handlePhoneLogin = React.useCallback(
    (mobilePhone: string, pinCode: string) =>
      api.phone.login(language as string, {
        mobilePhone,
        pinCode
      }),
    []
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleSendCode = React.useCallback(
    (phone: string, retry?: boolean) =>
      api.phone.sendCode(language as string, { mobilePhone: phone }, retry),
    []
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleValidatePhoneNumber = React.useCallback(
    (phone: string) =>
      api.phone.validate(language as string, {
        countryISO,
        phone
      }),
    [language, countryISO]
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleForgotPassword = React.useCallback(
    (email: string, retry?: boolean) =>
      api.password.resetRequest(language as string, { email }, retry),
    [language]
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleResetPassword = React.useCallback(
    (newPassword: string, pinCode: string) =>
      api.password.resetComplete(language as string, {
        email,
        newPassword,
        pinCode
      }),
    [email]
  );

  let subtitle = DEFAULT_SUBTITLE;

  if (unsubscribe) {
    subtitle = UNSUBSCRIBE_SUBTITLE;
  } else if (loginAgain) {
    subtitle = SESSION_DIED_SUBTITLE;
  }

  return (
    <>
      <Login
        restriction={restriction}
        loginActive={!!(login || loginAgain)}
        subtitle={subtitle}
        phoneCodes={phoneCodes as { all: string[]; active: string }}
        emailFromQuery={emailFromQuery as string}
        language={language as string}
        showPhoneLogin={showPhoneLogin}
        setEmail={setEmail}
        setPhoneMask={setPhoneMask}
        onForgotPassword={handleForgotPassword}
        onSendCode={handleSendCode}
        onEmailLogin={handleEmailLogin}
        onLoginResponse={handleLoginResponse}
        onPhoneLogin={handlePhoneLogin}
        onRemoveSelfExclusion={handleRemoveSelfExclusion}
        onValidatePhoneNumber={handleValidatePhoneNumber}
      />
      <ResetPassword
        forgotPasswordActive={!!forgot}
        language={language as string}
        phoneMask={phoneMask}
        email={email}
        restriction={restriction}
        onLoginResponse={handleLoginResponse}
        onForgotPassword={handleForgotPassword}
        onResetPasswordLogin={handleResetPassword}
        onRemoveSelfExclusion={handleRemoveSelfExclusion}
      />
    </>
  );
};

export default LoginContainer;
