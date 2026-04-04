import React, { FC, ReactNode, Children } from "react";
import styled from "styled-components";

export interface TabsProps {
  currentIndex: number;
  onChange: (newIndex: number) => void;
  children: ReactNode;
  className?: string;
}

const StyledTabs = styled.div`
  display: flex;
  width: 100%;
  min-height: 52px;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  border: solid 4px ${({ theme }) => theme.palette.accent};
  background: ${({ theme }) => theme.palette.accent};
`;

const Tabs: FC<TabsProps> = ({
  currentIndex,
  onChange,
  children,
  className
}) => {
  const transformedChildren = Children.map(
    children,
    (child: ReactNode, index: number) => {
      if (!React.isValidElement(child)) {
        return null;
      }

      return React.cloneElement(child, {
        onChange,
        tabIndex: index,
        selected: currentIndex === index
      });
    }
  );

  return (
    <StyledTabs className={className || ""}>{transformedChildren}</StyledTabs>
  );
};

export { Tabs };
