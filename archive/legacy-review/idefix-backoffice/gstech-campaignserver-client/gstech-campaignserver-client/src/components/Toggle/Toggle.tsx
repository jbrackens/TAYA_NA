import * as React from "react";
import styled from "styled-components";

const StyledToggle = styled.label`
  position: relative;
  display: inline-block;
  width: 28px;
  height: 16px;

  input {
    position: absolute;
    appearance: none;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({ theme }) => theme.palette.whiteDirty};
    transition: 0.4s;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 12px;
    width: 12px;
    left: 2px;
    bottom: 2px;
    background-color: ${({ theme }) => theme.palette.white};
    box-shadow: ${({ theme }) => theme.shadows.shadow1};
    transition: 0.4s;
  }

  input:checked + .slider {
    background-color: ${({ theme }) => theme.palette.blueLight};
  }

  input:focus + .slider {
    box-shadow: 0 0 1px ${({ theme }) => theme.palette.blue};
  }

  input:disabled + .slider {
    cursor: not-allowed;
  }

  input:checked + .slider:before {
    transform: translateX(12px);
    background-color: ${({ theme }) => theme.palette.blue};
  }

  .slider.round {
    border-radius: 16px;
  }

  .slider.round:before {
    border-radius: 20px;
  }
`;

export const Toggle: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <StyledToggle className={className}>
    <input type="checkbox" {...props} />
    <span className="slider round" />
  </StyledToggle>
);
