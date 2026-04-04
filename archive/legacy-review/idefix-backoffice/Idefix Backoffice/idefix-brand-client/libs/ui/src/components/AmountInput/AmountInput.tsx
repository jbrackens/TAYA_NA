import React, { FC } from "react";
import { BaseInputProps } from "../BaseInput";
import { Field as FormikField, FieldProps as FormikFieldProps } from "formik";
import { useRegistry } from "../../useRegistry";
import styled from "styled-components";
import cn from "classnames";

export interface AmountInputProps extends BaseInputProps {
  bonusAmount?: string;
}

const StyledAmountInput = styled.div`
  position: relative;

  .amount-input__bonus {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 40px;

    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.accent2};
  }
`;

const AmountInput: FC<AmountInputProps> = ({
  className,
  name,
  bonusAmount,
  ...inputProps
}) => {
  const { BaseInput } = useRegistry();

  return (
    <FormikField name={name}>
      {({ field }: FormikFieldProps) => (
        <StyledAmountInput>
          <BaseInput
            classes={{
              input: cn(className, "amount-input__input")
            }}
            {...field}
            {...inputProps}
          />
          {!!bonusAmount && (
            <span className="amount-input__bonus">{bonusAmount}</span>
          )}
        </StyledAmountInput>
      )}
    </FormikField>
  );
};

export { AmountInput };
