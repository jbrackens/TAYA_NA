import * as React from "react";
import styled from "styled-components";
import { Breakpoints } from "@brandserver-client/ui";
import { useDropDown } from "./useDropDown";

export interface DropdownItemProps {
  value: string;
  children: React.ReactNode;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ value, children }) => {
  const { handleChange } = useDropDown();
  return (
    <StyledDropdownItem>
      <span onClick={() => handleChange(value)}>{children}</span>
    </StyledDropdownItem>
  );
};

const StyledDropdownItem = styled.li`
  ${({ theme }) => theme.typography.text12};
  color: ${({ theme }) => theme.palette.contrast};
  line-height: 18px;
  padding: 11px 3px 0 38px;

  span {
    cursor: pointer;
  }

  &:last-child {
    padding-bottom: 5px;
  }

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    &:first-child {
      padding-top: 5px;
    }

    &:last-child {
      padding-bottom: 0;
    }
  }
`;

export { DropdownItem };
