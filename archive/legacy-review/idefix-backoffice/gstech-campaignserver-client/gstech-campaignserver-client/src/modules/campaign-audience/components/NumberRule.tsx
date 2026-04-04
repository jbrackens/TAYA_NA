import * as React from "react";
import styled from "styled-components";

import { Tab, TextInput, Tabs } from "../../../components";
import { FormikField } from "../../../fields";
import { IFormValues } from "../types";

const StyledNumberRule = styled.div`
  display: flex;
  align-items: center;

  .rule__value {
    max-width: 72px;
  }

  .rule__value-separator {
    margin: 0 8px 0 8px;
  }
`;

interface IProps {
  values: IFormValues;
  setValues: (values: any, shouldValidate?: boolean) => void;
  disabled?: boolean;
}

const NumberRule: React.FC<IProps> = ({ values, setValues, disabled }) => {
  const handleChangeOperator = React.useCallback(
    (newValue: string | number | string[] | boolean) => {
      if (newValue === "between") {
        setValues({ ...values, operator: newValue, values: ["1", "2"] });
      }

      if (newValue !== "between") {
        setValues({ ...values, negated: "is", operator: newValue, values: "1" });
      }
    },
    [values, setValues]
  );

  return (
    <StyledNumberRule>
      <Tabs value={values.operator} onChange={handleChangeOperator} disabled={disabled}>
        <Tab value="=">equal to</Tab>
        <Tab value=">=">at least</Tab>
        <Tab value=">">more than</Tab>
        <Tab value="between">between</Tab>
      </Tabs>
      <span className="campaign-rule__separator" />
      {values.operator !== "between" && (
        <FormikField name="values" disabled={disabled}>
          <TextInput className="rule__value" pattern="^[0-9]+$|^$" />
        </FormikField>
      )}
      {values.operator === "between" && (
        <>
          <FormikField name="values[0]" disabled={disabled}>
            <TextInput placeholder="from" className="rule__value" pattern="^[0-9]+$|^$" />
          </FormikField>
          <span className="rule__value-separator">-</span>
          <FormikField name="values[1]" disabled={disabled}>
            <TextInput placeholder="to" className="rule__value" pattern="^[0-9]+$|^$" />
          </FormikField>
        </>
      )}
    </StyledNumberRule>
  );
};

export default NumberRule;
