import * as React from "react";
import { useField } from "formik";
import { OnChangeValue } from "react-select";

import { ReactSelect } from "../../components";

interface Option {
  value: string | number;
  label: string;
}

interface Props {
  name: string;
  options: Option[];
  placeholder: string;
  icon?: React.ReactNode;
  isMulti?: boolean;
  creatable?: boolean;
  className?: string;
  disabled?: boolean;
}

const SelectField: React.FC<Props> = ({
  name,
  options,
  placeholder,
  icon,
  isMulti = true,
  creatable = false,
  className,
  disabled
}) => {
  const [field, meta, helpers] = useField(name);

  const { setValue } = helpers;
  const { value } = meta;

  const handleChange = React.useCallback(
    (option: OnChangeValue<unknown, boolean> | null) => {
      if (!option) {
        return isMulti ? setValue([]) : setValue("");
      }

      const newValue = isMulti ? (option as Option[]).map(item => item.value) : (option as Option).value;

      setValue(newValue);
    },
    [setValue, isMulti]
  );

  const getValue = React.useCallback(() => {
    if (options) {
      const newValue = isMulti
        ? options.filter(option => value.indexOf(option.value) >= 0)
        : options.find(option => option.value === value);

      if (newValue) {
        return newValue;
      } else {
        return isMulti ? [] : ("" as any);
      }
    } else {
      return isMulti ? [] : ("" as any);
    }
  }, [options, isMulti, value]);

  return (
    <ReactSelect
      options={options}
      name={name}
      isMulti={isMulti}
      creatable={creatable}
      value={getValue()}
      onChange={handleChange}
      onBlur={field.onBlur}
      placeholder={placeholder}
      icon={icon}
      className={className}
      disabled={disabled}
    />
  );
};

export default SelectField;
