import * as React from "react";
import styled from "styled-components";

import { Arrow } from "../../icons";

const StyledButton = styled.button`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 48px;
  background-color: ${({ theme }) => theme.palette.white};
  box-shadow: ${({ theme }) => theme.shadows.shadow1};
  cursor: pointer;
  outline: none;

  &:hover {
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.24);
  }

  &:active {
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.64);
  }

  &:disabled {
    cursor: not-allowed;
  }

  .button__icon {
    transform: rotate(-90deg);
    fill: ${({ theme }) => theme.palette.blackDark};
  }
`;

const BackButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = props => (
  <StyledButton {...props}>
    <Arrow className="button__icon" />
  </StyledButton>
);

export { BackButton };
