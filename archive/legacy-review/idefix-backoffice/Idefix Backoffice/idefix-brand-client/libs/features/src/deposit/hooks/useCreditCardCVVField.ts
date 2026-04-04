import * as React from "react";
import { useTheme } from "styled-components";
import { useSelector } from "react-redux";
import { selectPaymentIq } from "@brandserver-client/lobby";
import { useMessages } from "@brandserver-client/hooks";
import type { HostedFieldsCallbackResponse } from "../types";
import { HostedFields, Field } from "../components/HostedFieldsSDK";
import { getHostedFieldStyles } from "../components/HostedFields";

function useCreditCardCVVField(
  hostedFieldsRef: React.MutableRefObject<typeof HostedFields | undefined>,
  hostedFieldsValuesRef: React.MutableRefObject<
    HostedFieldsCallbackResponse | undefined
  >,
  showFieldLabel = true
) {
  const paymentIq = useSelector(selectPaymentIq)!;

  const theme = useTheme();

  const messages = useMessages({
    cvv: "my-account.deposit.creditcard.cvv",
    cvvPlaceholder: "my-account.deposit.creditcard.cvv-placeholder"
  });

  const creditCVVFieldConfig = {
    type: "CVV",
    id: "cvv",
    name: "cvv",
    label: messages.cvv,
    placeholder: messages.cvvPlaceholder,
    errorMessage: messages.cvv,
    visible: true,
    required: true
  };

  React.useEffect(() => {
    const creditCVVField = new Field(
      creditCVVFieldConfig.type as "CVV",
      creditCVVFieldConfig.id,
      creditCVVFieldConfig.name,
      creditCVVFieldConfig.label,
      showFieldLabel
        ? creditCVVFieldConfig.placeholder
        : creditCVVFieldConfig.label,
      creditCVVFieldConfig.errorMessage,
      creditCVVFieldConfig.visible,
      creditCVVFieldConfig.required
    );

    HostedFields.setup({
      merchantId: paymentIq.merchantId,
      hostedfieldsurl: paymentIq.frameUrl,
      fields: [creditCVVField],
      styles: getHostedFieldStyles(theme, showFieldLabel),
      callback: () => (response: HostedFieldsCallbackResponse) => {
        hostedFieldsValuesRef.current = response;
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onLoadCallback: () => () => {},
      el: "#credit-card-cvv-hosted-field-wrapper"
    });

    hostedFieldsRef.current = HostedFields;

    return () => {
      if (hostedFieldsRef.current) {
        hostedFieldsRef.current.reset();
        hostedFieldsRef.current = undefined;
      }

      if (hostedFieldsValuesRef.current) {
        hostedFieldsValuesRef.current = undefined;
      }
    };
  }, []);
}

export { useCreditCardCVVField };
