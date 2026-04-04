import React, { FC } from "react";
import styled from "styled-components";
import { Field as FormikField, FieldProps as FormikFieldProps } from "formik";
import { WarningIcon } from "@brandserver-client/icons";

const StyledFieldError = styled.div`
  display: flex;
  align-items: center;
  border-radius: 2px;
  color: ${({ theme }) => theme.palette.error};
  fill: ${({ theme }) => theme.palette.error};
  background: ${({ theme }) => theme.palette.contrast};

  ${({ theme }) => theme.typography.text12}

  &::before {
    content: "";
    width: 10px;
    height: 20px;
    border-radius: 2px 0 0 2px;
    background: ${({ theme }) => theme.palette.error};
  }

  .field-error__icon {
    width: 10px;
    height: 10px;
    margin-left: 5px;
  }

  .field-error__text {
    margin-left: 5px;
  }
`;

export interface FieldErrorProps {
  className?: string;
  name: string;
}

const FieldError: FC<FieldErrorProps> = ({ className, name }) => {
  return (
    <FormikField name={name}>
      {({ form }: FormikFieldProps<{ [key: string]: string }>) =>
        form.errors[name] ? (
          <StyledFieldError className={className}>
            <WarningIcon className="field-error__icon" />
            <div className="field-error__text">
              {form.errors[name] as React.ReactNode}
            </div>
          </StyledFieldError>
        ) : null
      }
    </FormikField>
  );
};

export { FieldError };
