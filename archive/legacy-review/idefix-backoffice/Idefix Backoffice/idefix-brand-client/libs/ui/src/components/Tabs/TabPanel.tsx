import React, { FC, ReactNode } from "react";
import cn from "classnames";
import styled from "styled-components";

const StyledTabPanel = styled.div`
  display: none;

  &.visible {
    display: flex;
  }
`;

export interface TabPanelProps {
  currentIndex: number;
  index: number;
  children: ReactNode;
  className?: string;
}

const TabPanel: FC<TabPanelProps> = ({
  currentIndex,
  index,
  children,
  className
}) => {
  return (
    <StyledTabPanel
      className={cn(className, {
        visible: currentIndex === index
      })}
    >
      {children}
    </StyledTabPanel>
  );
};

export { TabPanel };
