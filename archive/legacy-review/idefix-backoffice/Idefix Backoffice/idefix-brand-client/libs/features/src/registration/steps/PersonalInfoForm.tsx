import { useMessages } from "@brandserver-client/hooks";
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import { PhoneIcon, CheckIcon } from "@brandserver-client/icons";
import * as React from "react";
import { Form } from "formik";
import styled from "styled-components";

const StyledPersonalInfoForm = styled(Form)`
  .personal-info-form__fields-group {
    display: flex;
    width: 100%;

    /* Gap between children */
    & > *:not(:first-child) {
      margin-left: 24px;
    }

    &--name {
      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.bigMobile)} {
        flex-wrap: wrap;

        & > *:not(:first-child) {
          margin-left: 0;
        }
      }
    }
  }

  .personal-info-form__button {
    margin-top: 12px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-bottom: 25px;
    }
  }
`;

interface Props {
  countryISO: string;
  className?: string;
  phoneCodes: string[];
}

const PersonalInfoForm: React.FC<Props> = ({
  className,
  countryISO,
  phoneCodes
}) => {
  const isEmailVerification = countryISO === "CA";
  const {
    DateInput,
    TextInput,
    PhoneNumberInput,
    Field,
    Button,
    SubmitButton
  } = useRegistry();

  const messages = useMessages({
    title: "register.player-information.personal-information",
    phone: "my-account.profile.phone",
    codeWillBeSent: "register.player-information.verification-code",
    firstName: "register.firstname",
    lastName: "register.lastname",
    birthDate: "register.birthdate",
    day: "register.day",
    month: "register.month",
    year: "register.year",
    continue: "button.continue"
  });

  return (
    <StyledPersonalInfoForm className={className}>
      <h1>{messages.title}</h1>
      <Field
        className="personal-info-form__phone-field"
        name="phone"
        helper={
          !isEmailVerification && (
            <Field.HelperText>{messages.codeWillBeSent}</Field.HelperText>
          )
        }
        label={messages.phone}
      >
        <PhoneNumberInput
          name="phone"
          codes={phoneCodes}
          pattern="^[0-9]*$"
          autoFocus
          rightIcon={<PhoneIcon />}
        >
          {phoneCodes.map((code, index) => (
            <option key={index}>{code}</option>
          ))}
        </PhoneNumberInput>
      </Field>

      <div className="personal-info-form__fields-group personal-info-form__fields-group--name">
        <Field name="firstName" label={messages.firstName}>
          <TextInput
            placeholder={messages.firstName}
            pattern="^[^0-9@]*$"
            checkMarkIcon={<CheckIcon />}
            maxLength={40}
          />
        </Field>
        <Field name="lastName" label={messages.lastName}>
          <TextInput
            placeholder={messages.lastName}
            pattern="^[^0-9@]*$"
            checkMarkIcon={<CheckIcon />}
            maxLength={40}
          />
        </Field>
      </div>

      <Field
        name="dateOfBirth"
        classes={{ inputs: "personal-info-form__fields-group" }}
        label={messages.birthDate}
      >
        <DateInput checkMarkIcon={<CheckIcon />} />
      </Field>
      <SubmitButton
        className="personal-info-form__button"
        color={Button.Color.accent}
        size={Button.Size.large}
      >
        {messages.continue}
      </SubmitButton>
    </StyledPersonalInfoForm>
  );
};

export { PersonalInfoForm };
