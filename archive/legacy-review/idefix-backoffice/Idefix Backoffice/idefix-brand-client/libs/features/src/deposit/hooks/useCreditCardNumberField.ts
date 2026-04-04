import * as React from "react";
import { useSelector } from "react-redux";
import { useTheme } from "styled-components";
import { selectPaymentIq } from "@brandserver-client/lobby";
import { useMessages } from "@brandserver-client/hooks";
import { HostedFields, Field, FieldTypes } from "../components/HostedFieldsSDK";
import { getHostedFieldStyles } from "../components/HostedFields";

export function useCreditCardNumberField() {
  const paymentIq = useSelector(selectPaymentIq);

  const messages = useMessages({
    number: "my-account.deposit.creditcard.card-number",
    numberPlaceholder: "my-account.deposit.creditcard.card-number-placeholder"
  });

  const theme = useTheme();

  const creditNumberFieldConfig = {
    type: FieldTypes.CREDITCARD_NUMBER,
    id: "creditCard",
    name: "creditCard",
    label: messages.number,
    placeholder: messages.numberPlaceholder,
    errorMessage: messages.number,
    visible: true,
    required: true
  };

  React.useEffect(() => {
    const creditNumberField = new Field(
      creditNumberFieldConfig.type,
      creditNumberFieldConfig.id,
      creditNumberFieldConfig.name,
      creditNumberFieldConfig.label,
      creditNumberFieldConfig.placeholder,
      creditNumberFieldConfig.errorMessage,
      creditNumberFieldConfig.visible,
      creditNumberFieldConfig.required
    );

    HostedFields.setup({
      merchantId: paymentIq!.merchantId,
      hostedfieldsurl: paymentIq!.frameUrl,
      fields: [creditNumberField],
      styles: getHostedFieldStyles(theme, true),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      callback: () => () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onLoadCallback: () => () => {},
      el: "#credit-card-number-hosted-field-wrapper"
    });
  }, []);
}
