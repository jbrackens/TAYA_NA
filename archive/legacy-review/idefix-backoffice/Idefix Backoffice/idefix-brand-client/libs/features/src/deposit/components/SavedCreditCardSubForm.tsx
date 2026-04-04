import * as React from "react";
import styled from "styled-components";
import type { HostedFieldsCallbackResponse, HostedFields } from "../types";
import { useCreditCardCVVField } from "../hooks/useCreditCardCVVField";

interface Props {
  hostedFieldsRef: React.MutableRefObject<HostedFields | undefined>;
  hostedFieldsValuesRef: React.MutableRefObject<
    HostedFieldsCallbackResponse | undefined
  >;
}
const SavedCreditCardSubForm: React.FC<Props> = ({
  hostedFieldsRef,
  hostedFieldsValuesRef
}) => {
  useCreditCardCVVField(hostedFieldsRef, hostedFieldsValuesRef, false);

  return <StyledSavedCreditCard id="credit-card-cvv-hosted-field-wrapper" />;
};

const StyledSavedCreditCard = styled.div`
  &#credit-card-cvv-hosted-field-wrapper {
    .hosted-field-container {
      display: flex;
      height: 110px;
      width: 100%;
    }
  }

  &#credit-card-cvv-hosted-field-wrapper {
    .hosted-field-container iframe {
      border: 0px;
      width: 100%;
    }
  }
`;

export { SavedCreditCardSubForm };
