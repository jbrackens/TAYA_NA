import React, {
  createContext,
  FC,
  InputHTMLAttributes,
  useContext
} from "react";

export type RadioGroupOptions = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "value" | "onChange"
>;

const RadioGroupContext = createContext<RadioGroupOptions | undefined>(
  undefined
);

interface ProviderProps {
  children: React.ReactElement;
  options: RadioGroupOptions;
}

const RadioGroupOptionsProvider: FC<ProviderProps> = ({
  options,
  children
}) => {
  return (
    <RadioGroupContext.Provider value={options}>
      {children}
    </RadioGroupContext.Provider>
  );
};

type RadioFieldProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "value" | "checked" | "onChange"
>;

function useRadioFieldProps(radioFieldProps: RadioFieldProps): RadioFieldProps {
  const radioGroupOptions = useContext(RadioGroupContext);

  if (!radioGroupOptions || radioFieldProps.onChange) {
    return radioFieldProps;
  }

  return {
    name: radioGroupOptions.name,
    value: radioFieldProps.value,
    checked: radioGroupOptions.value === radioFieldProps.value,
    onChange: radioGroupOptions.onChange
  };
}

export { RadioGroupOptionsProvider, useRadioFieldProps };
