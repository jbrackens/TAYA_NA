import * as React from "react";
import styled from "styled-components";
import { Form, Formik, FormikHelpers } from "formik";
import { useMessages } from "@brandserver-client/hooks";
import { useRegistry } from "@brandserver-client/ui";
import { yup } from "@brandserver-client/lobby";
import { SetPasswordFormValues } from "./types";

interface Props {
  onSubmit: (
    values: SetPasswordFormValues,
    formikActions: FormikHelpers<SetPasswordFormValues>
  ) => Promise<void>;
}

const INITIAL_VALUES: SetPasswordFormValues = {
  password: ""
};

export const SetPasswordForm: React.FC<Props> = ({ onSubmit }) => {
  const messages = useMessages({
    setPassword: "sidebar.create-password",
    hint: "sidebar.create-password.hint",
    password: "login.password",
    enterPassword: "login.enter-password"
  });

  const { Field, PasswordInput, SubmitButton } = useRegistry();

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      password: yup
        .string()
        .required()
        .min(6)
        .matches(/[A-Z]/, "my-account.profile.weak-password")
        .matches(/\d/, "my-account.profile.weak-password")
        .label(messages.password)
    });
  }, [messages]);

  return (
    <Formik
      initialValues={INITIAL_VALUES}
      onSubmit={onSubmit}
      validationSchema={validationSchema}
      validateOnMount
    >
      {formik => (
        <StyledSetPasswordForm>
          <h2>{messages.setPassword}</h2>
          <p>{messages.hint}</p>
          <Field name="password" label={messages.password}>
            <PasswordInput placeholder={messages.enterPassword} />
          </Field>
          <SubmitButton
            size={SubmitButton.Size.large}
            color={SubmitButton.Color.accent}
          >
            {messages.setPassword}
          </SubmitButton>
          {formik.status &&
            formik.status.errors &&
            formik.status.errors.generic && (
              <div className="set-password__error">
                {formik.status.errors.generic}
              </div>
            )}
        </StyledSetPasswordForm>
      )}
    </Formik>
  );
};

const StyledSetPasswordForm = styled(Form)`
  h2 {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.primary};
    margin-bottom: 16px;
  }

  p {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.primary};
    margin-bottom: 12px;
  }

  .set-password__error {
    margin-top: 8px;
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.error};
    text-align: center;
  }
`;
