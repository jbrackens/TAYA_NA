import { useMessages } from "@brandserver-client/hooks";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { CheckIcon } from "@brandserver-client/icons";
import { Form } from "formik";
import * as React from "react";
import styled from "styled-components";

const StyledAddressForm = styled(Form)`
  .address-form__fields-group {
    display: flex;
    width: 100%;

    & > :first-child {
      max-width: 128px;
    }

    /* Gap between children */
    & > *:not(:first-child) {
      margin-left: 24px;
    }
  }

  .address-form__submit {
    margin-top: 27px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-bottom: 25px;
    }
  }
`;

interface Props {
  className?: string;
  countries: {
    CountryISO: string;
    CountryName: string;
  }[];
  countryISO: string;
}

const AddressForm: React.FC<Props> = ({ className, countries, countryISO }) => {
  const { TextInput, Field, Button, SubmitButton, Select } = useRegistry();

  const messages = useMessages({
    title: "register.address.title",
    address: "register.street-address",
    country: "register.country",
    postCode: "register.postcode",
    city: "register.city",
    continue: "button.continue"
  });

  return (
    <StyledAddressForm className={className}>
      <h1>{messages.title}</h1>
      <Field name="address" label={messages.address}>
        <TextInput
          placeholder={messages.address}
          autoFocus
          checkMarkIcon={<CheckIcon />}
          maxLength={80}
        />
      </Field>
      <div className="address-form__fields-group">
        <Field name="postCode" label={messages.postCode}>
          <TextInput
            placeholder={messages.postCode}
            checkMarkIcon={<CheckIcon />}
            maxLength={15}
          />
        </Field>
        <Field name="city" label={messages.city}>
          <TextInput
            placeholder={messages.city}
            pattern="^[^0-9@]*$"
            checkMarkIcon={<CheckIcon />}
            maxLength={80}
          />
        </Field>
      </div>
      {countries.length !== 0 && countryISO !== "FI" && (
        <Field name="countryISO" label={messages.country}>
          <Select>
            {countries.map(country => (
              <option key={country.CountryISO} value={country.CountryISO}>
                {country.CountryName}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <SubmitButton
        className="address-form__submit"
        color={Button.Color.accent}
        size={Button.Size.large}
      >
        {messages.continue}
      </SubmitButton>
    </StyledAddressForm>
  );
};

export { AddressForm };
