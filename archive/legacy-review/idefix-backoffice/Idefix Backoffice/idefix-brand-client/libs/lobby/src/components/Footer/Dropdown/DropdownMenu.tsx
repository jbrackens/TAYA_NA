import * as React from "react";
import styled from "styled-components";
import { Breakpoints } from "@brandserver-client/ui";

export interface DropdownProps {
  children: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownProps> = ({ children }) => {
  return <StyledDropdownMenu>{children}</StyledDropdownMenu>;
};

const StyledDropdownMenu = styled.ul`
  padding-top: 4px;
  border-radius: 4px 4px 0 0;
  position: absolute;
  width: 100%;
  bottom: calc(100% - 2px);
  border: 2px solid #3f3f3f;
  background: #262626;
  border-bottom: 0;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    bottom: unset;
    top: calc(100% - 2px);
    border: 2px solid #3f3f3f;
    border-top: 0;
    border-radius: 0 0 4px 4px;
    padding: 0 0 15px 0;
  }
`;

export { DropdownMenu };
