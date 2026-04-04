import * as React from "react";
import styled from "styled-components";

import { FormikField } from "../../../fields";
import { Tab, Tabs, TextInput } from "../../../components";
import { IFormValues } from "../types";

const StyledDepositAmountRule = styled.div`
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

const DepositAmountRule = ({ values, setValues, disabled }: IProps) => {
  const handleChangeOperator = React.useCallback(
    (newValue: string | number | string[] | boolean) => {
      if (newValue === "between") {
        setValues({ ...values, operator: newValue, values: [1, 2] });
      }

      if (newValue !== "between") {
        setValues({ ...values, negated: "is", operator: newValue, values: 1 });
      }
    },
    [setValues, values]
  );

  return (
    <StyledDepositAmountRule>
      <Tabs value={values.operator} onChange={handleChangeOperator} disabled={disabled}>
        <Tab value="<=">at most</Tab>
        <Tab value="=">equal to</Tab>
        <Tab value=">=">at least</Tab>
        <Tab value="between">between</Tab>
      </Tabs>
      <span className="campaign-rule__separator" />
      {values.operator !== "between" && (
        <FormikField name="values" disabled={disabled}>
          <TextInput className="rule__value" placeholder="10" type="number" />
        </FormikField>
      )}
      {values.operator === "between" && (
        <>
          <FormikField name="values[0]" disabled={disabled}>
            <TextInput className="rule__value" placeholder="10" type="number" />
          </FormikField>
          <span className="rule__value-separator">-</span>
          <FormikField name="values[1]" disabled={disabled}>
            <TextInput className="rule__value" placeholder="20" type="number" />
          </FormikField>
        </>
      )}
    </StyledDepositAmountRule>
  );
};

export default DepositAmountRule;
