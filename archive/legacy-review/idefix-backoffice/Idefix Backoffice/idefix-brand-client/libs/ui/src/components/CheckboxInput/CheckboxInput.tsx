import React, { InputHTMLAttributes } from "react";
import styled from "styled-components";
import cn from "classnames";
import { useField } from "formik";
import { CheckIcon } from "@brandserver-client/icons";

const StyledCheckbox = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  .checkbox-input__input {
    display: none;
  }
  .checkbox-input__icon-wrapper {
    min-width: 20px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    fill: none;
    border: 2px solid ${({ theme }) => theme.palette.accent};
    cursor: pointer;
  }
  .checkbox-input__icon-wrapper--error {
    border-color: ${({ theme }) => theme.palette.error};
  }
  .checkbox-input__input:checked + .checkbox-input__icon-wrapper {
    background: ${({ theme }) => theme.palette.accent};
    svg {
      fill: ${({ theme }) => theme.palette.contrast};
    }
  }
  .checkbox-input__label {
    margin-left: 8px;
    color: ${({ theme }) => theme.palette.contrastDark};
    ${({ theme }) => theme.typography.text16Bold};
  }
`;

export type CheckboxInputProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
};

const CheckboxInput: React.FC<CheckboxInputProps> = ({
  name,
  className,
  children,
  ...inputProps
}) => {
  const [field, meta] = useField({ name, type: "checkbox" });
  return (
    <StyledCheckbox className={className}>
      <input
        className="checkbox-input__input"
        type="checkbox"
        {...inputProps}
        {...field}
      />
      <span
        className={cn("checkbox-input__icon-wrapper", {
          "checkbox-input__icon-wrapper--error": meta.touched && !!meta.error
        })}
      >
        <CheckIcon />
      </span>
      <span className="checkbox-input__label">{children}</span>
    </StyledCheckbox>
  );
};

export { CheckboxInput };
