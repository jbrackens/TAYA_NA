import * as React from "react";
import styled from "styled-components";
import InputMask from "react-input-mask";
import { useRegistry } from "@brandserver-client/ui";
import { UserIcon, CalendarIcon } from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";
import { HostedFieldsCallbackResponse, HostedFields } from "../types";
import { useCreditCardNumberField } from "../hooks/useCreditCardNumberField";
import { useCreditCardCVVField } from "../hooks/useCreditCardCVVField";

const StyledCreditCard = styled.div`
  .credit-card__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    margin-bottom: 18px;
  }

  .credit-card__fields-group {
    display: flex;
    width: 100%;

    /* Gap between children */
    & > *:not(:first-child) {
      margin-left: 36px;
    }

    & > * {
      width: 50%;
    }
  }

  .credit-card__input {
    margin-top: 7px;
  }

  #credit-card-number-hosted-field-wrapper {
    .hosted-field-container {
      width: 100%;
      display: flex;
      height: 110px;
    }
  }

  #credit-card-number-hosted-field-wrapper {
    .hosted-field-container iframe {
      width: 100%;
      border: 0px;
    }
  }

  #credit-card-cvv-hosted-field-wrapper {
    .hosted-field-container {
      display: flex;
      height: 110px;
      width: 100%;
    }
  }

  #credit-card-cvv-hosted-field-wrapper {
    .hosted-field-container iframe {
      border: 0px;
      width: 100%;
    }
  }
`;
interface CreditCardValues {
  cardHolderName: string;
  cardExpiryDate: string;
}

interface Props {
  values: CreditCardValues;
  hostedFieldsRef: React.MutableRefObject<HostedFields | undefined>;
  hostedFieldsValuesRef: React.MutableRefObject<
    HostedFieldsCallbackResponse | undefined
  >;
  onChange(e: React.ChangeEvent<any>): void;
  onBlur(e: React.FocusEvent<any>): void;
}
const CreditCardSubForm: React.FC<Props> = ({
  values,
  hostedFieldsRef,
  hostedFieldsValuesRef,
  onChange,
  onBlur
}) => {
  const { Field, TextInput } = useRegistry();

  const messages = useMessages({
    title: "my-account.deposit.creditcard.title",
    number: "my-account.deposit.creditcard.card-number",
    numberPlaceholder: "my-account.deposit.creditcard.card-number-placeholder",
    holder: "my-account.deposit.creditcard.card-holder",
    holderPlaceholder:
      "my-account.deposit.creditcard.enter-card-holder-placeholder",
    date: "my-account.deposit.creditcard.expiry-date-label",
    datePlaceholder: "my-account.deposit.creditcard.expiry-date",
    cvv: "my-account.deposit.creditcard.cvv",
    cvvPlaceholder: "my-account.deposit.creditcard.cvv-placeholder"
  });

  useCreditCardNumberField(); // useCreditCardNumberField should executes before useCreditCardCVVField.
  useCreditCardCVVField(hostedFieldsRef, hostedFieldsValuesRef);

  return (
    <StyledCreditCard>
      <h2 className="credit-card__title">{messages.title}</h2>
      <div>
        <div id="credit-card-number-hosted-field-wrapper"></div>
        <Field
          name="cardHolderName"
          label={messages.holder}
          className="credit-card__input"
        >
          <TextInput
            className="base-input__input-component--deposit"
            type="text"
            placeholder={messages.holderPlaceholder}
            rightIcon={<UserIcon />}
          />
        </Field>
        <div className="credit-card__fields-group credit-card__fields-group--desktop">
          <Field name="cardExpiryDate" label={messages.date}>
            <InputMask
              mask="99/99"
              value={values.cardExpiryDate}
              onChange={onChange}
              onBlur={onBlur}
              name="cardExpiryDate"
            >
              {inputProps => (
                <TextInput
                  {...inputProps}
                  className="base-input__input-component--deposit"
                  type="text"
                  placeholder={messages.datePlaceholder}
                  rightIcon={<CalendarIcon />}
                />
              )}
            </InputMask>
          </Field>
          <div id="credit-card-cvv-hosted-field-wrapper" />
        </div>
      </div>
    </StyledCreditCard>
  );
};
export { CreditCardSubForm };
