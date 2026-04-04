import { useMessages } from "@brandserver-client/hooks";
import { ChevronRightIcon } from "@brandserver-client/icons";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { Form } from "formik";
import * as React from "react";
import styled from "styled-components";

const StyledTermsForm = styled(Form)`
  display: flex;
  align-items: center;
  justify-content: flex-start;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    align-items: flex-start;
    justify-content: space-between;
  }

  .terms-form__header {
    width: 100%;

    h1 {
      margin-bottom: 25px;
    }
  }

  .terms-form__checkbox-list {
    width: 100%;

    & > *:not(:first-child) {
      margin-top: 20px;
    }

    a {
      color: ${({ theme }) => theme.palette.accent};
    }
  }

  .terms-form__submit {
    margin-top: 37px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-bottom: 25px;
    }
  }

  .button__icon {
    fill: ${({ theme }) => theme.palette.contrast};
    height: 15px;
  }
`;

interface Props {
  className?: string;
  onOpenPage(page: "terms_and_conditions" | "privacypolicy"): void;
}

const TermsForm: React.FC<Props> = ({ className, onOpenPage }) => {
  const { SubmitButton, CheckboxInput, FormattedMessageLink } = useRegistry();

  const messages = useMessages({
    title: "register.terms.title",
    button: "register.terms.button",
    terms: "register.complete.options.terms",
    privacy: "register.complete.options.privacy"
  });

  return (
    <StyledTermsForm className={className}>
      <div className="terms-form__header">
        <h1>{messages.title}</h1>
        <div className="terms-form__checkbox-list">
          <CheckboxInput name="termsConfirm">
            <FormattedMessageLink
              id={messages.terms}
              onClick={() => onOpenPage("terms_and_conditions")}
            />
          </CheckboxInput>
          <CheckboxInput name="policyConfirm">
            <FormattedMessageLink
              id={messages.privacy}
              onClick={() => onOpenPage("privacypolicy")}
            />
          </CheckboxInput>
        </div>
      </div>
      <SubmitButton
        autoFocus
        type="submit"
        size={SubmitButton.Size.large}
        color={SubmitButton.Color.accent}
        className="terms-form__submit"
        icon={<ChevronRightIcon className="button__icon" />}
      >
        {messages.button}
      </SubmitButton>
    </StyledTermsForm>
  );
};

export { TermsForm };
