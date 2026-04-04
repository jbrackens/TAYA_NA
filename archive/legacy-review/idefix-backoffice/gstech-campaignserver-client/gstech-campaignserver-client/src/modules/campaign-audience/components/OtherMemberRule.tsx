import * as React from "react";

import { MINUTES_RULE_OPTIONS } from "..";
import { Tab, Tabs, TextInput, Checkbox } from "../../../components";
import { FormikField, SelectField, TabsField } from "../../../fields";
import { IFormValues } from "../types";

interface Option {
  value: string | number;
  label: string;
}
interface IProps {
  options: Option[];
  disabled?: boolean;
  values: IFormValues;
  setValues: (values: any, shouldValidate?: boolean) => void;
}

const CampaignMembersRule: React.FC<IProps> = ({ options, disabled, values, setValues }) => {
  const handleChangeOperator = React.useCallback(() => {
    if (!!values.values.withinMinutes?.withinMinutes) {
      return setValues({
        ...values,
        operator: "otherCampaignsMember",
        values: { ...values.values, withinMinutes: undefined }
      });
    }
    return setValues({
      ...values,
      values: { ...values.values, withinMinutes: { withinMinutes: "1", multiplier: MINUTES_RULE_OPTIONS[0].value } }
    });
  }, [setValues, values]);

  return (
    <>
      <TabsField name="values.state" disabled={disabled}>
        <Tab value="any">any</Tab>
        <Tab value="complete">complete</Tab>
        <Tab value="incomplete">incomplete</Tab>
        <Tab value="expired">expired</Tab>
      </TabsField>

      <span className="campaign-rule__separator" />
      <SelectField options={options} name="values.campaignIds" placeholder="Add campaign" disabled={disabled} />
      <span className="campaign-rule__separator" />
      <Checkbox checked={!!values.values.withinMinutes?.withinMinutes} onChange={() => handleChangeOperator()} />
      <Tabs value={!!values.values.withinMinutes} onChange={handleChangeOperator} disabled={disabled}>
        <Tab value={true}>within</Tab>
      </Tabs>
      {values.values.withinMinutes && (
        <>
          <span className="campaign-rule__separator" />
          <FormikField name="values.withinMinutes.withinMinutes" disabled={disabled}>
            <TextInput className="rule__value" pattern="^[0-9]+$|^$" placeholder="1" />
          </FormikField>
          <span className="campaign-rule__separator" />
          <SelectField
            options={MINUTES_RULE_OPTIONS}
            name="values.withinMinutes.multiplier"
            placeholder="Multiplier"
            isMulti={false}
            disabled={disabled}
          />
        </>
      )}
    </>
  );
};
export default CampaignMembersRule;
