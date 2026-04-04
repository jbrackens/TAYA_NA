import React, { FC } from "react";
import { RadioGroupOptions, RadioGroupOptionsProvider } from "./RadioContext";

export type RadioGroupProps = RadioGroupOptions & {
  children: React.ReactElement;
};

const RadioGroup: FC<RadioGroupProps> = ({
  children,
  ...radioGroupOptions
}) => {
  return (
    <RadioGroupOptionsProvider options={radioGroupOptions}>
      {children}
    </RadioGroupOptionsProvider>
  );
};

export { RadioGroup };
