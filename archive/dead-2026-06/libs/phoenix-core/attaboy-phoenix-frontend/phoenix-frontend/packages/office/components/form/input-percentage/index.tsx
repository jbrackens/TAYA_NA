import React from "react";
import { InputNumber } from "antd";
import { InputNumberProps } from "antd/lib/input-number";

export type InputPercentageValue = number | undefined;
export type InputPercentageInputValue = InputPercentageValue | string | null;
export type InputPercentageProps = InputNumberProps;

const InputPercentage = (props: InputNumberProps) => {
  const { defaultValue = 0 } = props;
  return (
    <InputNumber
      formatter={(value) => `${value}%`}
      parser={(value = `${defaultValue}%`) => value.replace("%", "")}
      {...props}
    />
  );
};

export default InputPercentage;
