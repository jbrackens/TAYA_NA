import { Field as FormikField, FieldProps as FormikFieldProps } from "formik";
import React, { FC } from "react";
import { BaseInput, BaseInputProps } from "../BaseInput";
import { DropDownIcon } from "@brandserver-client/icons";
import styled from "styled-components";

export type SelectProps = Omit<BaseInputProps, "rightIcon">;

const StyledInput = styled(BaseInput)`
  .select__input {
    padding-right: 13px;
  }
  .select__icon {
    fill: ${({ theme }) => theme.palette.primary} !important;
    pointer-events: none;
  }
`;

const Select: FC<SelectProps> = ({ name, ...inputProps }) => (
  <FormikField name={name}>
    {({ field }: FormikFieldProps<string, { [key: string]: string }>) => (
      <StyledInput
        classes={{ input: "select__input", icon: "select__icon" }}
        inputComponent="select"
        rightIcon={<DropDownIcon />}
        {...field}
        {...inputProps}
        name={name}
      />
    )}
  </FormikField>
);

export { Select };
