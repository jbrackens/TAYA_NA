import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

const StyledTab = styled.label`
  display: flex;
  align-items: center;

  .tab__text {
    display: flex;
    align-items: center;
    padding: 6px 16px;
    color: ${({ theme }) => theme.palette.blackDark};
    transition: 0.4s;
    white-space: nowrap;
    cursor: pointer;

    &.tab__text--teal {
      color: ${({ theme }) => theme.palette.teal};
    }
  }

  .tab__input {
    display: none;

    &:checked + .tab__text {
      border-radius: 8px;
      background-color: ${({ theme }) => theme.palette.white};
      box-shadow: ${({ theme }) => theme.shadows.shadow1};
      height: 28px;
      cursor: default;
      pointer-events: none;

      &.tab__text--black {
        color: ${({ theme }) => theme.palette.black};
      }
      &.tab__text--teal {
        color: ${({ theme }) => theme.palette.teal};
      }
      & > svg {
        fill: ${({ theme }) => theme.palette.blackDark};
      }
    }

    &:disabled + .tab__text {
      cursor: not-allowed;
    }
  }
`;

export interface TabProps {
  children: React.ReactNode;
  value: string | number | string[] | boolean;
  color?: "black" | "teal";
  className?: string;
}

const Tab: React.FC<TabProps> = ({ children, className, value, color = "black", ...rest }) => (
  <StyledTab className={cn(className, "text-main-med")}>
    <input
      className={cn("tab__input")}
      type="radio"
      value={typeof value === "boolean" ? value.toString() : value}
      {...rest}
    />
    <span className={cn("tab__text", `tab__text--${color}`)}>{children}</span>
  </StyledTab>
);

export { Tab };
