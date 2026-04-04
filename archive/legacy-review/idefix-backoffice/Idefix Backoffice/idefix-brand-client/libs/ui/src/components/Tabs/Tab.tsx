import React, { FC, ReactNode } from "react";
import styled from "styled-components";
import cn from "classnames";

export interface TabProps {
  className?: string;
  tabIndex?: number;
  selected?: boolean;
  onChange?: (newIndex: number) => void;
  children?: ReactNode;
}

const StyledTab = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  min-height: 44px;
  padding: 4px;

  text-transform: uppercase;
  text-align: center;
  ${({ theme }) => theme.typography.text16Bold};
  cursor: pointer;

  color: ${({ theme }) => theme.palette.contrast};
  background-color: ${({ theme }) => theme.palette.accent};
  border-radius: ${({ theme }) => theme.shape.borderRadius};

  &:first-of-type {
    margin-right: 4px;
  }

  &.selected {
    background-color: ${({ theme }) => theme.palette.contrast};
    color: ${({ theme }) => theme.palette.accent};
    box-shadow: ${({ theme }) => theme.shadows.loginSwitcherButton};
  }

  &:not(.selected) {
    &:hover {
      background: ${({ theme }) => theme.palette.accentLightest};
    }
  }
`;

const Tab: FC<TabProps> = ({
  className,
  tabIndex = 0,
  selected = false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange = () => {},
  children
}) => {
  return (
    <StyledTab
      className={cn(className, {
        selected
      })}
      onClick={() => {
        onChange(tabIndex);
      }}
    >
      {children}
    </StyledTab>
  );
};

export { Tab };
