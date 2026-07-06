import React from "react";
import { CoreInput } from "..";

export type PasswordInputProps = {
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
  maxLength?: number;
  value?: string;
  onChange?: (e: React.FormEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FormEvent<HTMLInputElement>) => void;
  style?: any;
  placeholder?: string;
  testId?: string;
  className?: string;
  isErrorVisible?: boolean;
  errorText?: string;
  label?: string;
  spaceUnder?: boolean;
};

const PasswordInput: React.FC<PasswordInputProps> = ({
  defaultValue,
  disabled,
  id,
  maxLength,
  value,
  onChange,
  onBlur,
  children,
  style,
  placeholder,
  testId,
  className,
  isErrorVisible,
  errorText,
  label,
  spaceUnder,
}) => {
  return (
    <CoreInput
      className={className}
      defaultValue={defaultValue}
      disabled={disabled}
      id={id}
      maxLength={maxLength}
      type={"password"}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      style={style}
      placeholder={placeholder}
      data-testid={testId}
      isErrorVisible={isErrorVisible}
      errorText={errorText}
      label={label}
      spaceUnder={spaceUnder}
    >
      {children}
    </CoreInput>
  );
};

export { PasswordInput };
