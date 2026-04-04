import React, { InputHTMLAttributes } from "react";
import { Field as FormikField, FieldProps as FormikFieldProps } from "formik";
import { CheckIcon } from "@brandserver-client/icons";
import styled from "styled-components";
import { Breakpoints } from "../../breakpoints";

const StyledRadio = styled.label`
  display: flex;
  align-items: center;

  .radio-field__input {
    display: none;
  }

  .radio-field__radio {
    margin-top: 1px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    fill: none;
    border: 2px solid ${({ theme }) => theme.palette.accent};
    cursor: pointer;
  }

  .radio-field__input:checked + .radio-field__radio {
    border: none;
    background: ${({ theme }) => theme.palette.accent};
    fill: ${({ theme }) => theme.palette.contrast};
  }

  .radio-field__label {
    padding-bottom: 1px;
    margin-left: 8px;
    ${({ theme }) => theme.typography.text12};
  }

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    .radio-field__label {
      ${({ theme }) => theme.typography.text16};
    }
  }
`;

export type RadioFieldProps = InputHTMLAttributes<HTMLInputElement>;

const RadioField: React.FC<RadioFieldProps> = ({
  className,
  children,
  name,
  value,
  ...inputProps
}) => {
  return (
    <FormikField name={name}>
      {({ field: { value: fieldValue, ...field } }: FormikFieldProps) => (
        <StyledRadio className={className}>
          <input
            className="radio-field__input"
            type="radio"
            value={value}
            checked={value == fieldValue}
            {...field}
            {...inputProps}
            name={name}
          />
          <span className="radio-field__radio">
            <CheckIcon />
          </span>
          <span className="radio-field__label">{children}</span>
        </StyledRadio>
      )}
    </FormikField>
  );
};

export { RadioField };
