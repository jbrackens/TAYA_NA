import * as React from "react";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { EmailIcon } from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";
import { Form } from "formik";
import styled from "styled-components";
import cn from "classnames";

const StyledEmailPasswordForm = styled(Form)`
  .email-form__submit {
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-top: 6px;
      margin-bottom: 25px;
    }
  }
`;

interface Props {
  className?: string;
  fullscreen?: boolean;
}

const EmailPasswordForm: React.FC<Props> = ({ className, fullscreen }) => {
  const { TextInput, PasswordInput, Field, Button, SubmitButton } =
    useRegistry();

  const messages = useMessages({
    title: "register.title",
    email: "login.email",
    invalidEmailError: "error.invalid-email",
    emailPlaceholder: "register.email-placeholder",
    password: "login.password",
    invalidPasswordError: "error.invalid-password",
    passwordPlaceholder: "sidebar.create-password",
    passwordHelper: "sidebar.create-password.hint",
    submit: "button.continue"
  });

  return (
    <StyledEmailPasswordForm className={className}>
      {fullscreen && <h1>{messages.title}</h1>}
      <Field name="email" label={messages.email}>
        <TextInput
          placeholder={messages.emailPlaceholder}
          rightIcon={<EmailIcon />}
        />
      </Field>
      <Field
        name="password"
        label={messages.password}
        helper={<Field.HelperText>{messages.passwordHelper}</Field.HelperText>}
      >
        <PasswordInput placeholder={messages.passwordPlaceholder} />
      </Field>
      <SubmitButton
        color={Button.Color.accent}
        size={Button.Size.large}
        style={{ marginTop: 12 }}
        className={cn({ "email-form__submit": fullscreen })}
      >
        {messages.submit}
      </SubmitButton>
    </StyledEmailPasswordForm>
  );
};

export { EmailPasswordForm };
