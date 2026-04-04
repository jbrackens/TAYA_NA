import * as React from "react";
import Router from "next/router";
import { Formik, Form, FormikHelpers, FormikProps } from "formik";
import { useRegistry } from "@brandserver-client/ui";
import { EmailIcon } from "@brandserver-client/icons";
import { errorCodes } from "@brandserver-client/utils";
import { useMessages } from "@brandserver-client/hooks";
import { yup } from "@brandserver-client/lobby";
import {
  LoginResponse,
  ResetPasswordResponse
} from "@brandserver-client/types";

interface EmailFormValues {
  email: string;
  password: string;
}

interface EmailFormProps {
  initialEmail?: string;
  language: string;
  onEmailLogin: (email: string, password: string) => Promise<LoginResponse>;
  onLoginResponse: (response: LoginResponse) => void;
  onForgotPassword: (email: string) => Promise<ResetPasswordResponse>;
  setEmail: (email: string) => void;
  setPhoneMask: (number: string) => void;
  isLoginOpen: boolean;
  changeLoginOpen: (isLoginOpen: boolean) => void;
  changeForgotOpen: (isForgotOpen: boolean) => void;
  onCloseModal: () => void;
}

const EmailForm: React.FC<EmailFormProps> = ({
  initialEmail = "",
  language,
  onEmailLogin,
  onLoginResponse,
  onForgotPassword,
  setEmail,
  setPhoneMask,
  isLoginOpen,
  changeLoginOpen,
  changeForgotOpen,
  onCloseModal
}) => {
  const { Field, TextInput, PasswordInput, Button, SubmitButton } =
    useRegistry();

  const INITIAL_VALUES: EmailFormValues = {
    email: initialEmail,
    password: ""
  };

  const messages = useMessages({
    email: "login.email",
    emailPlaceholder: "register.email-placeholder",
    password: "login.password",
    passwordPlaceholder: "login.enter-password",
    passwordHelper: "sidebar.create-password.hint",
    submit: "login.action",
    forgot: "login.forgot",
    invalidEmailPasswordError: "error.invalid-email-password",
    signup: "login.signup",
    dontHaveAccount: "login.donthaveaccount",
    dontHaveAccount2: "login.donthaveaccount2"
  });

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      email: yup.string().required().email().label(messages.email),
      password: yup.string().required().min(6).label(messages.password)
    });
  }, [messages]);

  const handleSubmit = React.useCallback(
    async (
      { email, password }: EmailFormValues,
      { setFieldError, setSubmitting }: FormikHelpers<EmailFormValues>
    ) => {
      try {
        const response = await onEmailLogin(email, password);

        const { ok, code, result } = response;

        const errorCode = code && code.toLocaleUpperCase();

        if (ok !== undefined && !ok && result) {
          return setFieldError(
            "email",
            errorCode === errorCodes.INVALID_LOGIN_DETAILS
              ? messages.invalidEmailPasswordError
              : result
          );
        }

        onLoginResponse(response);
      } catch (err) {
        console.log(err, "err");
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const handleForgotPasswordClick = React.useCallback(
    async ({
      setFieldTouched,
      setFieldError,
      errors,
      values
    }: FormikProps<EmailFormValues>) => {
      try {
        setFieldTouched("email");
        if (values.email && !errors.email) {
          const { ok, number } = await onForgotPassword(values.email);
          if (ok !== undefined && !ok) {
            return setFieldError(
              "email",
              values.email === ""
                ? "register.email-placeholder"
                : "error.invalid-email"
            );
          }

          setEmail(values.email);

          if (number) {
            setPhoneMask(number);
          }

          if (isLoginOpen) {
            changeForgotOpen(true);
            changeLoginOpen(false);
          } else {
            Router.push(
              `/?lang=${language}&forgot=true`,
              `/${language}/forgot`
            );
          }
        }
      } catch (err) {
        console.log(err, "err");
      }
    },
    [language, isLoginOpen]
  );

  const handleChange = React.useCallback(
    (
        setFieldValue: (
          field: string,
          value: any,
          shouldValidate?: boolean | undefined
        ) => void
      ) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const trimmedValue = event.target.value.trim();
        setFieldValue(event.target.name, trimmedValue);
      },
    []
  );

  return (
    <Formik
      initialValues={INITIAL_VALUES}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
    >
      {form => (
        <Form>
          <div className="input-list">
            <div className="input-item">
              <Field name="email" label={messages.email}>
                <TextInput
                  placeholder={messages.emailPlaceholder}
                  rightIcon={<EmailIcon />}
                  onChange={handleChange(form.setFieldValue)}
                />
              </Field>
            </div>
            <div className="input-item">
              <Field name="password" label={messages.password}>
                <PasswordInput
                  placeholder={messages.passwordPlaceholder}
                  onChange={handleChange(form.setFieldValue)}
                />
              </Field>
            </div>
            <div className="feedback">
              <div
                className="feedback__forgot-password"
                onClick={() => handleForgotPasswordClick(form)}
              >
                {messages.forgot}
              </div>
              <a onClick={onCloseModal}>{messages.signup}</a>
            </div>
          </div>

          <div>
            <SubmitButton color={Button.Color.accent} size={Button.Size.large}>
              {messages.submit}
            </SubmitButton>
            <div className="footer">
              {messages.dontHaveAccount}{" "}
              <a onClick={onCloseModal}>{messages.dontHaveAccount2}</a>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default EmailForm;
