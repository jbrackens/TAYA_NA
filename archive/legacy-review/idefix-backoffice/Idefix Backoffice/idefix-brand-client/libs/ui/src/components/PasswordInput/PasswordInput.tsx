import React, { FC, InputHTMLAttributes, useState } from "react";
import { VisibilityIcon, VisibilityOffIcon } from "@brandserver-client/icons";
import styled from "styled-components";
import { TextInput } from "../TextInput";

const StyledPasswordInput = styled.div`
  width: 100%;

  .password-input__visibility-icon {
    cursor: pointer;
  }
`;

export interface PasswordInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

const PasswordInput: FC<PasswordInputProps> = ({
  error,
  success,
  ...inputProps
}) => {
  const [hidden, setHidden] = useState(true);

  return (
    <StyledPasswordInput>
      <TextInput
        error={error}
        success={success}
        type={hidden ? "password" : "text"}
        rightIcon={
          hidden ? (
            <VisibilityIcon
              className="password-input__visibility-icon"
              onClick={() => setHidden(false)}
            />
          ) : (
            <VisibilityOffIcon
              className="password-input__visibility-icon"
              onClick={() => setHidden(true)}
            />
          )
        }
        {...inputProps}
      />
    </StyledPasswordInput>
  );
};

export { PasswordInput };
