import {
  LoginResponse,
  PhoneValidationResponse,
  ResetPasswordResponse,
  SendCodeResponse,
  LoginRestriction
} from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { CloseIcon } from "@brandserver-client/icons";
import Router from "next/router";
import * as React from "react";
import { FormattedMessage } from "react-intl";
import Restriction from "../components/Restriction";
import EmailForm from "../forms/EmailForm";
import PhoneForm from "../forms/PhoneForm";
import { StyledLogin } from "./styled";
import {
  toggleRegistration,
  changeForgotOpen,
  LobbyState,
  changeLoginOpen,
  getLoginStatus
} from "@brandserver-client/lobby";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

interface Props {
  loginActive?: boolean;
  subtitle: React.ReactNode;
  restriction: LoginRestriction;
  phoneCodes: {
    active: string;
    all: string[];
  };
  emailFromQuery?: string;
  language: string;
  showPhoneLogin: boolean;
  setEmail: (email: string) => void;
  setPhoneMask: (number: string) => void;
  onEmailLogin: (email: string, password: string) => Promise<LoginResponse>;
  onLoginResponse: (response: LoginResponse) => void;
  onPhoneLogin: (phone: string, code: string) => Promise<LoginResponse>;
  onRemoveSelfExclusion: (exclusionKey: string) => void;
  onValidatePhoneNumber: (phone: string) => Promise<PhoneValidationResponse>;
  onForgotPassword: (email: string) => Promise<ResetPasswordResponse>;
  onSendCode: (phone: string, retry?: boolean) => Promise<SendCodeResponse>;
  isLoginOpen: boolean;
  actions: {
    toggleRegistration: () => void;
    changeForgotOpen: (forgot: boolean) => void;
    changeLoginOpen: (isOpen: boolean) => void;
  };
}

const Login: React.FC<Props> = ({
  loginActive,
  subtitle,
  restriction,
  setEmail,
  setPhoneMask,
  onEmailLogin,
  onLoginResponse,
  onPhoneLogin,
  onRemoveSelfExclusion,
  onValidatePhoneNumber,
  onForgotPassword,
  phoneCodes,
  emailFromQuery,
  language,
  showPhoneLogin,
  onSendCode,
  isLoginOpen,
  actions: { toggleRegistration, changeForgotOpen, changeLoginOpen }
}) => {
  const { Modal, Tab, Tabs, TabPanel } = useRegistry();

  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleClose = React.useCallback(() => {
    if (isLoginOpen) {
      return changeLoginOpen(false);
    }
    Router.push(`/?lang=${language}`, `/${language}`);
  }, [language, isLoginOpen, changeLoginOpen]);

  return (
    <StyledLogin>
      {(loginActive || isLoginOpen) && (
        <Modal onClose={handleClose}>
          <>
            <span className="close-btn d--md--none" onClick={handleClose}>
              <CloseIcon />
            </span>
            {!restriction.restrictionActive && (
              <div className="login">
                <h2 className="login__title">
                  <FormattedMessage id="login.title" />
                </h2>
                <div className="login__subtitle">{subtitle}</div>
                {showPhoneLogin && (
                  <Tabs
                    currentIndex={currentIndex}
                    onChange={setCurrentIndex}
                    className="login__tabs"
                  >
                    <Tab>
                      <FormattedMessage id="login.email" />
                    </Tab>
                    <Tab>
                      <FormattedMessage id="my-account.profile.phone" />
                    </Tab>
                  </Tabs>
                )}
                <TabPanel
                  currentIndex={currentIndex}
                  index={0}
                  className="login__tab-panel"
                >
                  <EmailForm
                    initialEmail={emailFromQuery}
                    language={language}
                    onEmailLogin={onEmailLogin}
                    onLoginResponse={onLoginResponse}
                    onForgotPassword={onForgotPassword}
                    setEmail={setEmail}
                    setPhoneMask={setPhoneMask}
                    isLoginOpen={isLoginOpen}
                    changeLoginOpen={changeLoginOpen}
                    changeForgotOpen={changeForgotOpen}
                    onCloseModal={handleClose}
                  />
                </TabPanel>
                <TabPanel
                  currentIndex={currentIndex}
                  index={1}
                  className="login__tab-panel"
                >
                  <PhoneForm
                    phoneCodes={phoneCodes}
                    onPhoneLogin={onPhoneLogin}
                    onLoginResponse={onLoginResponse}
                    onSendCode={onSendCode}
                    onValidatePhoneNumber={onValidatePhoneNumber}
                    onCloseModal={handleClose}
                    onToggleFullScreenRegistration={toggleRegistration}
                  />
                </TabPanel>
              </div>
            )}
            {restriction.restrictionActive && (
              <Restriction
                language={language}
                restriction={restriction}
                onRemoveSelfExclusion={onRemoveSelfExclusion}
              />
            )}
          </>
        </Modal>
      )}
    </StyledLogin>
  );
};

const mapStateToProps = (state: LobbyState) => ({
  isLoginOpen: getLoginStatus(state) || false
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: bindActionCreators(
    { toggleRegistration, changeForgotOpen, changeLoginOpen },
    dispatch
  )
});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
