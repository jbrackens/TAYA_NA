import React from "react";
import cn from "classnames";
import styled from "styled-components";

const StyledMenuWrapper = styled.div`
  width: 25px;

  &.nav-icon:after,
  &.nav-icon:before,
  &.nav-icon div {
    border-radius: 3px;
    content: "";
    display: block;
    height: 3px;
    margin: 7px 0;
    transition: all 0.2s ease-in-out;
  }

  &.nav-icon.opened:before {
    transform: translateY(8px) rotate(135deg);
  }

  &.nav-icon.opened:after {
    transform: translateY(-12px) rotate(-135deg);
  }

  &.nav-icon.opened div {
    transform: scale(0);
  }
`;

export interface MenuAnimatedProps {
  opened: boolean;
  className?: string;
}

export const MenuAnimated: React.FC<MenuAnimatedProps> = ({
  opened,
  className
}) => (
  <StyledMenuWrapper
    className={cn(`${className} nav-icon`, {
      opened
    })}
  >
    <div></div>
  </StyledMenuWrapper>
);
