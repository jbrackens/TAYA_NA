import * as React from "react";
import styled from "styled-components";

import { Plus } from "../../icons";

const StyledButton = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 48px;
  background: ${({ theme }) => theme.palette.blue};
  box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.32);
  cursor: pointer;
  outline: none;

  &:hover {
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.16)), #4042e9;
  }

  &:active {
    background: ${({ theme }) => theme.palette.blue};
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.64);
  }

  &:disabled {
    cursor: not-allowed;
  }

  .fab-button__icon {
    fill: ${({ theme }) => theme.palette.white};
  }
`;

const FabButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ ...props }) => (
  <StyledButton {...props}>
    <Plus className="fab-button__icon" />
  </StyledButton>
);

export { FabButton };
