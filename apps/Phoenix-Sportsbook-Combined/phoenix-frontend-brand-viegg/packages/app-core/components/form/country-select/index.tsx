import React from "react";
import { CoreSelect } from "../../ui/select";
import { CoreForm } from "../../ui/form";
import { SelectContainer } from "../../ui/form/index.styled";

type Rule = {
  required: boolean;
  message: string;
};

type Props = {
  label: string;
  name: string | string[];
  rules: Rule[];
  restrictToCountry?: string;
};

const CountrySelect: React.FC<Props> = (props) => {
  const countries = require("./data.json");
  const { Option, OptionContent } = CoreSelect;
  const countryRestriction = props.restrictToCountry
    ? props.restrictToCountry
    : false;

  const getCountries = () => {
    let content: any[] = [];

    countries.map((country: any) => {
      const disabled =
        countryRestriction && countryRestriction != country.value
          ? true
          : false;
      content.push(
        <Option key={country.value} value={country.value} disabled={disabled}>
          <OptionContent>{country.label}</OptionContent>
        </Option>,
      );
    });

    return content;
  };

  return (
    <SelectContainer>
      <CoreForm.Item label={props.label} name={props.name} rules={props.rules}>
        <CoreSelect
          dropdownStyle={{
            backgroundColor: "transparent",
          }}
        >
          {getCountries()}
        </CoreSelect>
      </CoreForm.Item>
    </SelectContainer>
  );
};

export { CountrySelect };
