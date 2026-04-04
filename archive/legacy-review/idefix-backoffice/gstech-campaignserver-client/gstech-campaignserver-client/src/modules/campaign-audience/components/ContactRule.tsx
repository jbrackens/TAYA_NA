import * as React from "react";
import styled from "styled-components";

import { TextInput } from "../../../components";
import { FormikField, SelectField } from "../../../fields";
import { MINUTES_RULE_OPTIONS } from "../index";

const StyledContactRule = styled.div`
  display: flex;
  align-items: center;

  .rule__value {
    max-width: 72px;
  }
`;

interface Props {
  disabled?: boolean;
}

const ContactRule: React.FC<Props> = ({ disabled }) => (
  <StyledContactRule>
    <>
      <FormikField name="values.withinMinutes" disabled={disabled}>
        <TextInput className="rule__value" pattern="^[0-9]+$|^$" placeholder="1" />
      </FormikField>
      <span className="campaign-rule__separator" />
      <SelectField
        options={MINUTES_RULE_OPTIONS}
        name="values.multiplier"
        placeholder="Multiplier"
        isMulti={false}
        disabled={disabled}
      />
    </>
  </StyledContactRule>
);

export default ContactRule;
