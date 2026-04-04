import cn from "classnames";
import React, { FC, ReactNode, ChangeEvent } from "react";
import styled from "styled-components";
import { TextInput, TextInputProps } from "../TextInput/TextInput";
import { CountryCodeSelect } from "./CountryCodeSelect";

const StyledPhoneNumberInput = styled.div`
  width: 100%;
  position: relative;

  .phone-number-input__code-select {
    max-width: 70px;
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
  }

  &.phone-number-input {
    .phone-number-input__text-field {
      padding-left: 84px;
    }
  }
`;

export interface BasePhoneNumberInputProps extends TextInputProps {
  handleCodeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handlePhoneChange: (e: ChangeEvent<HTMLInputElement>) => void;
  phoneValue: string;
  codeValue: string;
  error?: boolean;
  success?: boolean;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

const BasePhoneNumberInput: FC<BasePhoneNumberInputProps> = ({
  handleCodeChange,
  handlePhoneChange,
  phoneValue,
  codeValue,
  error,
  success,
  rightIcon,
  children,
  ...inputProps
}) => {
  return (
    <StyledPhoneNumberInput
      className={cn({
        "phone-number-input": true,
        "phone-number-input--right-icon": !!rightIcon,
        "phone-number-input--error": error,
        "phone-number-input--success": success
      })}
    >
      <CountryCodeSelect
        name="phoneCode"
        className="phone-number-input__code-select"
        value={codeValue}
        onChange={handleCodeChange}
      >
        {children}
      </CountryCodeSelect>
      <TextInput
        type="number"
        className="phone-number-input__text-field"
        error={error}
        success={success}
        rightIcon={rightIcon}
        value={phoneValue}
        onChange={handlePhoneChange}
        {...inputProps}
      />
    </StyledPhoneNumberInput>
  );
};

export { BasePhoneNumberInput };
