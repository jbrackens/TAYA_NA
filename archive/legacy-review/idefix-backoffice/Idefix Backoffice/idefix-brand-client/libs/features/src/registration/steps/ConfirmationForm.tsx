import * as React from "react";
import { Form, FormikHelpers } from "formik";
import styled from "styled-components";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { PhoneIcon, EmailIcon } from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";
import capitalize from "lodash/capitalize";

const StyledConfirmationForm = styled(Form)`
  .confirmation-form__code-sent {
    display: flex;
  }

  .confirmation-form__code-sent-icon {
    flex-shrink: 0;
    width: 37px;
    height: 37px;
    margin-left: -7px;
    fill: ${({ theme }) => theme.palette.accent};
  }

  .confirmation-form__code-sent-text {
    margin-left: 10px;
    ${({ theme }) => theme.typography.text16};
  }

  .confirmation-form__verification-field {
    width: 100%;
    margin-top: 23px;
  }

  .confirmation-form__pin-code-helper {
    ${({ theme }) => theme.typography.text16BoldUpper}
  }

  .confirmation-form__link {
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
    color: ${({ theme }) => theme.palette.accent};
  }

  .confirmation-form__submit {
    margin-top: 20px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-bottom: 25px;
    }
  }

  .confirmation-form__submit-error {
    margin-top: 10px;
  }

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    .confirmation-form__label + * {
      margin-top: 14px;
    }
  }
`;

interface Props {
  countryISO: string;
  className?: string;
  onResendPinCode(values: unknown, actions: FormikHelpers<unknown>): void;
}

const ConfirmationForm: React.FC<Props> = ({
  className,
  countryISO,
  onResendPinCode
}) => {
  const [newCodeSent, setNewCodeSent] = React.useState(false);
  const isEmailVerification = countryISO === "CA";

  const handleResendPinCode = React.useCallback(
    async (values: unknown, actions: FormikHelpers<unknown>) => {
      try {
        setNewCodeSent(false);
        await onResendPinCode(values, actions);
        setNewCodeSent(true);
      } catch (err) {
        // do nothing
      }
    },
    [onResendPinCode]
  );

  const {
    Field,
    FieldError,
    FieldSuccess,
    SecurityInput,
    Button,
    SubmitButton
  } = useRegistry();

  const messages = useMessages({
    title: "register.confirmation.confirm-account",
    verificationCodeSent: "register.confirmation.verification-code-sent-check",
    verificationCodeSentByEmail:
      "register.confirmation.verification-code-sent-сheck-email",
    pinCode: "register.pincode",
    resendVerificationCode: "register.confirmation.verification-code-resend",
    newCodeSent: "register.confirmation.new-code-sent",
    createAccount: "register.cta"
  });
  const buttonText = capitalize(messages.createAccount);

  return (
    <StyledConfirmationForm className={className}>
      <h1>{messages.title}</h1>

      <div className="confirmation-form__code-sent">
        {isEmailVerification ? (
          <>
            <EmailIcon className="confirmation-form__code-sent-icon" />
            <div className="confirmation-form__code-sent-text">
              {messages.verificationCodeSentByEmail}
            </div>
          </>
        ) : (
          <>
            <PhoneIcon className="confirmation-form__code-sent-icon" />
            <div className="confirmation-form__code-sent-text">
              {messages.verificationCodeSent}
            </div>
          </>
        )}
      </div>

      <div className="confirmation-form__verification-field">
        <FieldError name="resend-failed" />
        {newCodeSent && <FieldSuccess>{messages.newCodeSent}</FieldSuccess>}

        <Field
          name="pinCode"
          label={messages.pinCode}
          helper={
            <Field.HelperAction
              onClick={handleResendPinCode}
              className="confirmation-form__pin-code-helper"
            >
              {messages.resendVerificationCode}
            </Field.HelperAction>
          }
        >
          <SecurityInput clear={newCodeSent} />
        </Field>
      </div>

      <SubmitButton
        className="confirmation-form__submit"
        color={Button.Color.accent}
        size={Button.Size.large}
      >
        {buttonText}
      </SubmitButton>

      <FieldError className="confirmation-form__submit-error" name="general" />
    </StyledConfirmationForm>
  );
};

export { ConfirmationForm };
