import * as React from "react";
import styled from "styled-components";
import { Breakpoints } from "@brandserver-client/ui";

interface IProps {
  children: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}

export const BottomNavigation: React.FC<IProps> = ({
  children,
  value,
  onChange
}) => {
  return (
    <StyledBottomNavigation>
      {React.Children.map(children, (child, childIndex) => {
        if (!React.isValidElement(child)) {
          return null;
        }

        const childValue =
          child.props.value === undefined ? childIndex : child.props.value;

        return React.cloneElement(child, {
          selected: childValue === value,
          value: childValue,
          onChange
        });
      })}
    </StyledBottomNavigation>
  );
};

const StyledBottomNavigation = styled.div`
  --bottom-navigation-height: 80px;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }) => theme.palette.primary};
  box-shadow: ${({ theme }) => theme.shadows.mobileFooter};
  width: 100%;
  height: var(--bottom-navigation-height);
  z-index: 1004;

  @media (orientation: landscape) {
    --bottom-navigation-height: 56px;
  }

  /* for iPhone 11+ */
  @supports (padding: max(0px)) {
    & {
      padding-bottom: max(0px, env(safe-area-inset-bottom));
      height: max(
        var(--bottom-navigation-height),
        calc(var(--bottom-navigation-height) + env(safe-area-inset-bottom))
      );
    }
  }

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    display: none;
  }
`;
