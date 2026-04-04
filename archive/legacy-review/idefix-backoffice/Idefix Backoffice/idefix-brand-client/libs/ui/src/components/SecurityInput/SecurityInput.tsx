import React from "react";
import ReactCodeInput from "react-code-input";
import styled from "styled-components";
import cn from "classnames";
import { useField } from "formik";
import { Breakpoints } from "../../breakpoints";

const FIELDS_NUMBER = 6;

const StyledSecurityInput = styled.div`
  width: 100%;

  .react-code-input {
    width: 100%;
    display: flex !important;
    justify-content: space-around;

    input {
      ${({ theme }) => theme.typography.text24BoldCapitalize};
      font-size: 24px !important;
      color: ${({ theme }) => theme.palette.primary} !important;
      height: 52px !important;
      caret-color: ${({ theme }) => theme.palette.secondaryLightest};
      background-color: ${({ theme }) =>
        theme.palette.secondaryLightest} !important;
      width: auto !important;
      min-width: 36px;
      border-radius: ${({ theme }) => theme.shape.borderRadius} !important;
      text-align: center;
      padding-left: 0 !important;
      border: none !important;
      box-shadow: 0 0 0 1px ${({ theme }) => theme.palette.secondaryLight} !important;

      &:focus {
        box-shadow: 0 0 0 1px ${({ theme }) => theme.palette.accent} !important;
      }

      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        height: 55px !important;
      }
    }
  }

  &.security-input--error input {
    box-shadow: 0 0 0 1px ${({ theme }) => theme.palette.error} !important;
  }

  /* Removes error outline when any input is focused */
  &.security-input--error:focus-within input:not(:focus) {
    box-shadow: 0 0 0 1px ${({ theme }) => theme.palette.secondary} !important;
  }
`;

export interface SecurityInputProps {
  className?: string;
  name?: string;
  error?: boolean;
  clear?: boolean;
}

const SecurityInput: React.FC<SecurityInputProps> = ({
  className,
  name = "",
  error = false,
  clear
}) => {
  const securityInputRef = React.useRef<any>();

  const [_field, _meta, helpers] = useField(name);

  const { setValue } = helpers;

  React.useEffect(() => {
    if (clear && securityInputRef.current) {
      for (let i = 0; i < FIELDS_NUMBER; i++) {
        securityInputRef.current.state.input[i] = "";
      }
      securityInputRef.current.textInput[0].focus();
    }
  }, [clear]);

  const handleChange = React.useCallback(
    (value: string) => {
      setValue(value);
    },
    [setValue]
  );

  return (
    <StyledSecurityInput
      className={cn(className, {
        "security-input--error": error
      })}
    >
      <ReactCodeInput
        name="pin"
        inputMode="numeric"
        fields={FIELDS_NUMBER}
        type="number"
        ref={securityInputRef}
        onChange={handleChange}
      />
    </StyledSecurityInput>
  );
};

export { SecurityInput };
