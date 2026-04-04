import * as React from "react";
import styled from "styled-components";

const StyledIconButton = styled.button`
  padding: 9px;
  width: 32px;
  height: 32px;
  background: ${({ theme }) => theme.palette.secondaryLight};
  margin-bottom: 16px;
  border-radius: 4px;
  border: 0;
  cursor: pointer;
  svg {
    width: 15px;
    height: 15px;
    fill: ${({ theme }) => theme.palette.primary};
  }
  &:hover {
    background: ${({ theme }) => theme.palette.accent};
  }
  &:active {
    background: ${({ theme }) => theme.palette.accentDark};
  }
`;

export interface IconButtonProps {
  icon: JSX.Element;
  className?: string;
  action?: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, className, action }) => {
  return (
    <StyledIconButton className={className} onClick={action}>
      {icon}
    </StyledIconButton>
  );
};

export { IconButton };
