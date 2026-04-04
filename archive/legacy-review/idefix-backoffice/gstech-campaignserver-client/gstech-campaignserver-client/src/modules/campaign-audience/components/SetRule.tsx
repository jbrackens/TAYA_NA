import * as React from "react";

import { SelectField, CreatableSelectField } from "../../../fields";

interface Option {
  value: string | number;
  label: string;
}

interface IProps {
  placeholder: string;
  options: Option[];
  creatable?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const SetRule: React.FC<IProps> = ({ placeholder, options, creatable, icon, disabled }) => {
  if (creatable) {
    return (
      <CreatableSelectField options={options} name="values" placeholder={placeholder} icon={icon} disabled={disabled} />
    );
  }
  return <SelectField options={options} name="values" placeholder={placeholder} icon={icon} disabled={disabled} />;
};

export default SetRule;
