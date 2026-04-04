import * as React from "react";
import { Form, Formik, FormikHelpers } from "formik";
import styled from "styled-components";
import { useMessages } from "@brandserver-client/hooks";
import { useRegistry } from "@brandserver-client/ui";
import { yup } from "@brandserver-client/lobby";
import { ChangePasswordFormValues } from "./types";

const StyledChangePassword = styled(Form)`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin: 0 10px;

  .change-password__info {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    margin: 0px 0px 10px 0px;
  }

  .change-password__info-title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.primary};
    margin-bottom: 16px;
  }

  .change-password__info-valid-rules {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
    margin-bottom: 12px;
  }

  .change-password__submit-button {
    ${({ theme }) => theme.typography.text18Bold};
  }

  .change-password__submit-button_disabled {
    cursor: not-allowed;
  }

  .change-password__notifications {
    margin-top: 8px;
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.error};
    text-align: center;
  }
`;

interface Props {
  onChangePassword: (
    values: ChangePasswordFormValues,
    formikActions: FormikHelpers<ChangePasswordFormValues>
  ) => void;
}

const initialValues: ChangePasswordFormValues = {
  oldPassword: "",
  newPassword: ""
};

const ChangePassword: React.FC<Props> = ({ onChangePassword }) => {
  const messages = useMessages({
    changePassword: "my-account.profile.changepassword",
    hint: "sidebar.create-password.hint",
    oldPassword: "my-account.profile.oldPassword",
    newPassword: "my-account.profile.password",
    enterOldPassword: "my-account.profile.enter-old-password",
    enterNewPassword: "my-account.profile.enter-new-password",
    changePassword2: "my-account.profile.change-password"
  });

  const { Field, PasswordInput, Button } = useRegistry();

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      oldPassword: yup.string().required().label(messages.oldPassword),
      newPassword: yup
        .string()
        .required()
        .min(6)
        .matches(/[A-Z]/, "my-account.profile.weak-password")
        .matches(/\d/, "my-account.profile.weak-password")
        .label(messages.newPassword)
    });
  }, [messages]);

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={onChangePassword}
      validationSchema={validationSchema}
    >
      {formik => (
        <StyledChangePassword className="change-password">
          <div className="change-password__info">
            <div className="change-password__info-title">
              {messages.changePassword}
            </div>
            <div className="change-password__info-valid-rules">
              {messages.hint}
            </div>
          </div>
          <div className="change-password__input-fields">
            <Field name="oldPassword" label={messages.oldPassword}>
              <PasswordInput placeholder={messages.enterOldPassword} />
            </Field>
            <Field name="newPassword" label={messages.newPassword}>
              <PasswordInput placeholder={messages.enterNewPassword} />
            </Field>
          </div>
          <Button
            type="submit"
            size={Button.Size.large}
            color={Button.Color.accent}
            className="change-password__submit-button"
            disabled={!formik.isValid || formik.isSubmitting}
          >
            {messages.changePassword2}
          </Button>
          {formik.status &&
            formik.status.errors &&
            formik.status.errors.generic && (
              <div className="change-password__notifications">
                {formik.status.errors.generic}
              </div>
            )}
        </StyledChangePassword>
      )}
    </Formik>
  );
};

export default ChangePassword;
