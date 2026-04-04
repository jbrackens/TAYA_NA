import * as React from "react";
import styled from "styled-components";
import subDays from "date-fns/subDays";
import format from "date-fns/format";

import { Tab, TextInput, Tabs } from "../../../components";
import { FormikField, DatePickerField, SelectField } from "../../../fields";
import { IFormValues } from "../types";
import { MINUTES_RULE_OPTIONS } from "../";

const StyledDepositRule = styled.div`
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

const DepositRule: React.FC<IProps> = ({ values, setValues, disabled }) => {
  const handleChangeOperator = React.useCallback(
    (newOperator: string | number | string[] | boolean) => {
      if (newOperator === "between") {
        const yesterday = subDays(new Date(), 1);
        return setValues({
          ...values,
          operator: newOperator,
          values: [format(yesterday, "yyyy-MM-dd"), format(new Date(), "yyyy-MM-dd")]
        });
      }

      setValues({
        ...values,
        operator: newOperator,
        values: { withinMinutes: "1", multiplier: MINUTES_RULE_OPTIONS[0].value }
      });
    },
    [setValues, values]
  );

  return (
    <StyledDepositRule>
      <Tabs value={values.operator} onChange={handleChangeOperator} disabled={disabled}>
        <Tab value="between">between</Tab>
        <Tab value="withinMinutes">within</Tab>
      </Tabs>
      <span className="campaign-rule__separator" />
      {values.operator !== "between" && values.operator !== "withinMinutes" && (
        <DatePickerField name="values" disabled={disabled} />
      )}
      {values.operator === "between" && (
        <>
          <DatePickerField name="values[0]" placeholder="from" disabled={disabled} />
          <span className="rule__value-separator">-</span>
          <DatePickerField name="values[1]" placeholder="to" disabled={disabled} />
        </>
      )}
      {values.operator === "withinMinutes" && (
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
      )}
    </StyledDepositRule>
  );
};

export default DepositRule;
