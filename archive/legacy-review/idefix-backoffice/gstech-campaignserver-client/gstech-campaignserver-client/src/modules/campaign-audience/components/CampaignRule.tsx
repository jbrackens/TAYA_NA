import * as React from "react";

import { Tab, Tabs } from "../../../components";
import { SelectField } from "../../../fields";
import { IFormValues } from "../types";

interface Option {
  value: string | number;
  label: string;
}

interface IProps {
  placeholder: string;
  options: Option[];
  values: IFormValues;
  setValues: (values: IFormValues, shouldValidate?: boolean) => void;
  disabled?: boolean;
}

const CampaignRule: React.FC<IProps> = ({ values, options, placeholder, setValues, disabled }) => {
  const handleChangeOperator = React.useCallback(
    (newValue: string | number | string[] | boolean) => {
      if (newValue === "=") {
        setValues({ ...values, operator: newValue, values: "" });
      } else {
        setValues({ ...values, operator: newValue as "in", values: [] });
      }
    },
    [setValues, values]
  );

  return (
    <>
      <Tabs value={values.operator} onChange={handleChangeOperator} disabled={disabled}>
        <Tab value="=">equally</Tab>
        <Tab value="in">in</Tab>
      </Tabs>
      <span className="campaign-rule__separator" />
      <SelectField
        options={options}
        name="values"
        placeholder={placeholder}
        isMulti={values.operator === "in"}
        disabled={disabled}
      />
    </>
  );
};

export default CampaignRule;
