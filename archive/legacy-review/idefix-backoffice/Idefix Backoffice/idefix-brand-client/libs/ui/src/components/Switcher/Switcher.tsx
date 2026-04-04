import * as React from "react";
import styled from "styled-components";

const StyledSwitcher = styled.label`
  position: relative;
  display: inline-block;
  width: 52px;
  height: 25px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({ theme }) => theme.palette.primaryLight};
    transition: 0.4s;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 21px;
    width: 21px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.4s;
  }

  input:checked + .slider {
    background-color: ${({ theme }) => theme.palette.accent2};
  }

  input:focus + .slider {
    box-shadow: "none";
  }

  input:checked + .slider:before {
    transform: translateX(27px);
  }

  .slider.round {
    border-radius: 34px;
  }

  .slider.round:before {
    border-radius: 50%;
  }
`;

export interface SwitcherProps {
  toggle?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}

const Switcher: React.FC<SwitcherProps> = ({ toggle, onToggle, disabled }) => (
  <StyledSwitcher>
    <input
      type="checkbox"
      checked={toggle}
      onChange={onToggle}
      disabled={disabled}
    />
    <span className="slider round"></span>
  </StyledSwitcher>
);

export { Switcher };
