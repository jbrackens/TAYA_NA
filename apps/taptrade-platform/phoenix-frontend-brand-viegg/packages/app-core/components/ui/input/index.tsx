import React, { FC, useState } from "react";
import { InputError } from "../input-error";
import { BaseInput, InputContainer, InputBox } from "./index.styled";
import { PasswordInput, PasswordInputProps } from "./password";
import EyeOutlined from "@ant-design/icons/EyeOutlined";
import EyeInvisibleOutlined from "@ant-design/icons/EyeInvisibleOutlined";

type CoreInputProps = {
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
  maxLength?: number;
  type?: string;
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

const CoreInput: React.FC<CoreInputProps> & {
  Password: FC<PasswordInputProps>;
} = ({
  defaultValue,
  disabled,
  id,
  maxLength,
  type,
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
  const [tempType, setTemptype] = useState<"password" | string | undefined>(
    type,
  );

  const Icon = tempType ? EyeInvisibleOutlined : EyeOutlined;
  const onIconClick = () =>
    setTemptype((prev) => (prev ? undefined : "password"));

  return (
    <InputContainer spaceUnder={!!spaceUnder}>
      {label && <label htmlFor={id}>{label}</label>}
      <InputBox>
        <BaseInput
          className={className}
          defaultValue={defaultValue}
          disabled={disabled}
          id={id}
          maxLength={maxLength}
          type={tempType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          style={style}
          placeholder={placeholder}
          data-testid={testId}
          errorMode={isErrorVisible}
        >
          {children}
        </BaseInput>
        {type === "password" && <Icon onClick={onIconClick} />}
      </InputBox>
      <InputError isVisible={!!isErrorVisible} text={errorText || ""} />
    </InputContainer>
  );
};

CoreInput.Password = PasswordInput;

export { CoreInput };
