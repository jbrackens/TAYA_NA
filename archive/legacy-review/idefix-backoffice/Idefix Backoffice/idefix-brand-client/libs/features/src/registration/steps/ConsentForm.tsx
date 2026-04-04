import { useMessages } from "@brandserver-client/hooks";
import { ChevronRightIcon } from "@brandserver-client/icons";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { Form } from "formik";
import capitalize from "lodash/capitalize";
import * as React from "react";
import styled from "styled-components";

const StyledConsentForm = styled(Form)`
  p {
    width: 100%;
    text-align: center;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      text-align: start;
    }

    &:last-of-type {
      margin-bottom: 40px;
    }
  }

  .consent-form__wrap {
    width: 100%;
  }

  .consent-form__main-info {
    ${({ theme }) => theme.typography.text16BoldUpper}
    line-height: 25px;
    margin-bottom: 13px;
  }

  .consent-form__additional-info {
    ${({ theme }) => theme.typography.text16}

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-top: 22px;
    }
  }

  .consent-from__button-wrap {
    width: 100%;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      display: flex;
      flex-direction: row-reverse;

      margin-top: 6px;
      margin-bottom: 25px;
    }
  }

  .button__icon {
    height: 15px;
    fill: ${({ theme }) => theme.palette.contrast};
  }

  .consent-form__button-yes {
    margin-bottom: 20px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-bottom: 0px;
      margin-left: 25px;
    }
  }

  && .consent-form__button-no {
    background: ${({ theme }) => theme.palette.secondaryLightest};
    color: ${({ theme }) => theme.palette.secondary};

    &:hover {
      background: ${({ theme }) => theme.palette.secondaryLightest};
      color: ${({ theme }) => theme.palette.secondary};
    }

    &:active {
      background: ${({ theme }) => theme.palette.secondaryLightest};
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      max-width: 55px;
    }
  }

  .consent-form__loader {
    max-height: 188px;
  }
`;

interface Props {
  isLoading?: boolean;
  className?: string;
  onButtonClick(value: "yes" | "no"): void;
}

const ConsentForm: React.FC<Props> = ({
  className,
  onButtonClick,
  isLoading
}) => {
  const { FieldError, Button, Loader } = useRegistry();

  const messages = useMessages({
    mainInfo: "register.consent.main-info",
    additionalInfo: "register.consent.additional-info",
    buttonYes: "register.consent.yes",
    buttonNo: "selfexclusion.confirmation.no"
  });

  if (isLoading) {
    return <Loader className="consent-form__loader" />;
  }

  return (
    <StyledConsentForm className={className}>
      <div className="consent-form__wrap">
        <p className="consent-form__main-info">{messages.mainInfo}</p>
        <p className="consent-form__additional-info">
          {messages.additionalInfo}
        </p>

        <FieldError className="consent-form__submit-error" name="general" />
      </div>

      <div className="consent-from__button-wrap">
        <Button
          size={Button.Size.large}
          color={Button.Color.accent}
          icon={<ChevronRightIcon />}
          className="consent-form__button-yes"
          type="submit"
          onClick={() => onButtonClick("yes")}
          autoFocus
        >
          {capitalize(messages.buttonYes)}
        </Button>
        <Button
          size={Button.Size.large}
          color={Button.Color.primary}
          className="consent-form__button-no"
          type="submit"
          onClick={() => onButtonClick("no")}
        >
          {capitalize(messages.buttonNo)}
        </Button>
      </div>
    </StyledConsentForm>
  );
};

export { ConsentForm };
