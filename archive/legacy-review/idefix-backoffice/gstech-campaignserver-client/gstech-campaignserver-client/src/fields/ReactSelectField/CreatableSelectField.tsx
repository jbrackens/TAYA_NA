import * as React from "react";
import { useField } from "formik";
import { OnChangeValue } from "react-select";
import uniqBy from "lodash/uniqBy";

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
  className?: string;
  disabled?: boolean;
}

const CreatableSelectField: React.FC<Props> = ({
  name,
  options,
  placeholder,
  icon,
  isMulti = true,
  className,
  disabled
}) => {
  const [field, meta, helpers] = useField(name);

  const { setValue } = helpers;
  const { value, initialValue } = meta;

  // if initial value exists and isn't exist option for that value we should create new option
  const [creatableOptions, setCreatableOptions] = React.useState(() => {
    const newOption = isMulti
      ? (initialValue as Option["value"][]).map(value => ({ label: value, value }))
      : [
          {
            label: initialValue,
            value: initialValue
          }
        ];

    return uniqBy([...options, ...(newOption as Option[])], "value");
  });

  const handleChange = React.useCallback(
    (option: OnChangeValue<unknown, boolean> | null) => {
      if (!option) {
        return isMulti ? setValue([]) : setValue("");
      }

      const newOption = isMulti ? option : [option];

      setCreatableOptions(prevState => uniqBy([...prevState, ...(newOption as Option[])], "value"));
      const newValue = isMulti ? (option as Option[]).map(item => item.value) : (option as Option).value;
      setValue(newValue);
    },
    [setValue, isMulti]
  );

  const getValue = React.useCallback(() => {
    if (creatableOptions) {
      const newValue = isMulti
        ? creatableOptions.filter(option => value.indexOf(option.value) >= 0)
        : creatableOptions.find(option => option.value === value);

      if (newValue) {
        return newValue;
      } else {
        return isMulti ? [] : ("" as any);
      }
    } else {
      return isMulti ? [] : ("" as any);
    }
  }, [creatableOptions, isMulti, value]);

  return (
    <ReactSelect
      options={creatableOptions}
      name={field.name}
      creatable={true}
      isMulti={isMulti}
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

export default CreatableSelectField;
