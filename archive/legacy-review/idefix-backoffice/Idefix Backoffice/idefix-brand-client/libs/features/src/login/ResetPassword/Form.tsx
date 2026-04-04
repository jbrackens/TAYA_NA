import * as React from "react";
import { Form, useFormikContext } from "formik";
import {
  LoginResponse,
  ResetPasswordResponse
} from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { AlertIcon } from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";
import { FormValues } from "./ResetPassword";

interface FormProps {
  phoneMask: string;
  email: string;
  onForgotPassword: (
    email: string,
    retry?: boolean
  ) => Promise<ResetPasswordResponse>;
  onLoginResponse: (response: LoginResponse) => void;
  onResetPasswordLogin: (
    password: string,
    pin: string
  ) => Promise<LoginResponse>;
  onCloseModal: () => void;
}

const ResetPasswordForm: React.FC<FormProps> = ({
  phoneMask,
  email,
  onForgotPassword,
  onCloseModal
}) => {
  const {
    values: { showResetPassword, pinCode },
    setFieldValue
  } = useFormikContext<FormValues>();
  const [sentAgain, setSentAgain] = React.useState(false);

  const { Field, SecurityInput, PasswordInput, Button, SubmitButton } =
    useRegistry();

  const messages = useMessages({
    forgotTitle: "password-reset.heading",
    forgotSubtitle: "password-reset.message-sent",
    resetTitle: "login.title",
    resetSubtitle: "sidebar.create-password.hint",
    pinCode: "password-reset.pincode-placeholder",
    pinCodeHelper: "register.confirmation.verification-code-resend",
    newCodeSent: "register.confirmation.new-code-sent",
    passwordPlaceholder: "sidebar.create-password",
    submit: "login.action",
    reset: "password-reset.set-new-password",
    password: "login.password",
    dontHaveAccount: "login.donthaveaccount",
    dontHaveAccount2: "login.donthaveaccount2"
  });

  React.useEffect(() => {
    if (pinCode.length === 6) {
      setFieldValue("showResetPassword", true);
    }
  }, [pinCode, setFieldValue]);

  const handleResendPinCode = React.useCallback(
    async (setFieldValue: (field: string, value: any) => void) => {
      try {
        setSentAgain(false);
        await onForgotPassword(email, true);
        setSentAgain(true);
        setFieldValue("pinCode", "");
      } catch (error) {
        console.log(error);
      }
    },
    [onForgotPassword, email]
  );

  return (
    <Form>
      {!showResetPassword && (
        <>
          <h2 className="title">{messages.forgotTitle}</h2>
          <p className="subtitle">{messages.forgotSubtitle}</p>
          <p className="phone">{phoneMask}</p>
          <div className="subform">
            <div className="input-list">
              <div className="input-item">
                <Field
                  name="pinCode"
                  label={messages.pinCode}
                  helper={
                    <Field.HelperAction
                      onClick={() => handleResendPinCode(setFieldValue)}
                    >
                      {messages.pinCodeHelper}
                    </Field.HelperAction>
                  }
                >
                  <SecurityInput clear={sentAgain} />
                </Field>
                {sentAgain && (
                  <div className="input-item__alert">
                    <AlertIcon />
                    {messages.newCodeSent}
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              color={Button.Color.accent}
              size={Button.Size.large}
              onClick={() => setFieldValue("showResetPassword", true)}
            >
              {messages.reset}
            </Button>
          </div>
        </>
      )}
      {showResetPassword && (
        <>
          <h2 className="title">{messages.resetTitle}</h2>
          <p className="subtitle">{messages.resetSubtitle}</p>
          <div className="subform">
            <div className="input-item password-field">
              <Field name="password">
                <PasswordInput placeholder={messages.passwordPlaceholder} />
              </Field>
            </div>
            <SubmitButton color={Button.Color.accent} size={Button.Size.large}>
              {messages.submit}
            </SubmitButton>
          </div>
        </>
      )}
      <div className="footer">
        {messages.dontHaveAccount}{" "}
        <a onClick={onCloseModal}>{messages.dontHaveAccount2}</a>
      </div>
    </Form>
  );
};

export default ResetPasswordForm;
