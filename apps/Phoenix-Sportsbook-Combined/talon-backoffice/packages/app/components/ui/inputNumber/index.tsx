import React from "react";
import { BaseInputNumber } from "./index.styled";

type CoreInputNumberProps = {
  autoFocus?: boolean;
  bordered?: boolean;
  decimalSeparator?: string;
  defaultValue?: string;
  disabled?: boolean;
  formatter?: (value: string | number | undefined) => string;
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
  onChange?: (value: string | number | null) => void;
  onPressEnter?: React.KeyboardEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onStep?: (value: string | number, info: { offset: string | number; type: 'up' | 'down' }) => void;
  style?: React.CSSProperties;
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
