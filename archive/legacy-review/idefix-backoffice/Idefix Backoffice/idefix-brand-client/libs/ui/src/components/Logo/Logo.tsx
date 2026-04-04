import * as React from "react";
import styled from "styled-components";
import { Breakpoints } from "../../breakpoints";

const StyledLogo = styled.img`
  width: 160px;
  height: 59px;
  cursor: pointer;
  display: block;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    width: 100px;
    height: 35px;
  }
`;

export const Logo = () => <StyledLogo />;
export const LogoNotification = () => <StyledLogo />;
export const NonLoggedInLogo = () => <StyledLogo />;
export const StickyLogoNotification = () => <StyledLogo />;
