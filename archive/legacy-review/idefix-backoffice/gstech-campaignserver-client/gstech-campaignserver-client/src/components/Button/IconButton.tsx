import * as React from "react";
import styled from "styled-components";

const StyledButton = styled.button`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border: none;
  background-color: ${({ theme }) => theme.palette.whiteDirty};
  border-radius: 8px;

  svg {
    fill: ${({ theme }) => theme.palette.blackMiddle};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover {
    cursor: pointer;
    svg {
      fill: ${({ theme }) => theme.palette.black};
    }
  }

  &:focus,
  &:active {
    outline: none;
    svg {
      fill: ${({ theme }) => theme.palette.black};
    }
  }
`;

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactElement<React.SVGAttributes<SVGSVGElement>>;
}

const IconButton: React.FC<IconButtonProps> = ({ children, ...rest }: IconButtonProps) => (
  <StyledButton type="button" {...rest}>
    {children}
  </StyledButton>
);

export { IconButton };
