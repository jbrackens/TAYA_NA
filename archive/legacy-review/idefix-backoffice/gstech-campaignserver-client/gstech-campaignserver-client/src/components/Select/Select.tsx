import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

import { Arrow } from "../../icons";

const StyledSelect = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.palette.black};
  .icon {
    display: inline-flex;
    position: absolute;
    pointer-events: none;
    right: 8px;
    transform: rotate(180deg);
  }
  .select {
    appearance: none;
    width: 100%;
    height: 32px;
    padding: 6px 36px 6px 8px;
    border: none;
    border-radius: 8px;
    background-color: ${({ theme }) => theme.palette.white};
    box-shadow: ${({ theme }) => theme.shadows.shadow1};
    font-size: 14px;
    line-height: 20px;
    cursor: pointer;

    &:hover {
      box-shadow: ${({ theme }) => theme.shadows.shadow2};
    }

    &:focus {
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.32);
      outline: none;
    }
    &.select-placeholder {
      color: ${({ theme }) => theme.palette.blackMiddle};
    }
    &:disabled {
      cursor: not-allowed;
    }
    &.select--error {
      border: 1px solid ${({ theme }) => theme.palette.red};
      color: ${({ theme }) => theme.palette.red};
    }
  }
`;
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select: React.FC<SelectProps> = ({ className, children, error, value, ...rest }) => (
  <StyledSelect className={className}>
    <Arrow className="icon" />
    <select
      className={cn("select", { "select--error": error, "select-placeholder": !value })}
      value={value || ""}
      {...rest}
    >
      {children}
    </select>
  </StyledSelect>
);

export { Select };
