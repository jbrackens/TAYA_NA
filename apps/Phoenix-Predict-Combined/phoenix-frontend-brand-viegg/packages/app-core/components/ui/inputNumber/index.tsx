import React from "react";
import { BaseInputNumber } from "./index.styled";

type CoreInputNumberProps = {
  autoFocus?: boolean;
  bordered?: boolean;
  decimalSeparator?: string;
  defaultValue?: string;
  disabled?: boolean;
  formatter?: (arg: any) => any;
  keyboard?: boolean;
  max?: number;
  min?: number;
  parser?: (displayValue: string | undefined) => number;
  precision?: number;
  readOnly?: boolean;
  size?: "large" | "middle" | "small";
  step?: number | string;
  stringMode?: boolean;
  value?: number;
  onChange?: (value: any) => void;
  onPressEnter?: (e: any) => void;
  onBlur?: (e: any) => void;
  onStep?: any;
  style?: any;
  testId?: string;
};

const CoreInputNumber: React.FC<CoreInputNumberProps> = ({
  autoFocus,
  bordered,
  decimalSeparator,
  defaultValue,
  disabled,
  formatter,
  keyboard,
  max,
  min,
  parser,
  precision,
  readOnly,
  size,
  step,
  stringMode,
  value,
  onChange,
  onPressEnter,
  onBlur,
  onStep,
  style,
  testId,
}) => {
  return (
    <BaseInputNumber
      autoFocus={autoFocus}
      bordered={bordered}
      decimalSeparator={decimalSeparator}
      defaultValue={defaultValue}
      disabled={disabled}
      formatter={formatter}
      keyboard={keyboard}
      max={max}
      min={min}
      parser={parser}
      precision={precision}
      readOnly={readOnly}
      size={size}
      step={step}
      stringMode={stringMode}
      value={value}
      onChange={onChange}
      onPressEnter={onPressEnter}
      onBlur={onBlur}
      onStep={onStep}
      style={style}
      data-testid={testId}
    />
  );
};

export { CoreInputNumber };
