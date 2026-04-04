import * as React from "react";
import styled from "styled-components";
import { rgba } from "@brandserver-client/utils";
import { CloseIcon } from "@brandserver-client/icons";

export const StyledCloseButton = styled.div`
  cursor: pointer;
  background: ${({ theme }) => rgba(theme.palette.primaryLight, 0.3)};
  border-radius: 4px;
  margin-left: 16px;
  padding: 10px;
  width: 36px;
  height: 36px;
  align-self: flex-start;

  &:hover {
    background: ${({ theme }) => theme.palette.primaryLight};
  }
  svg {
    fill: ${({ theme }) => theme.palette.contrast};
    width: 16px;
    height: 16px;
  }
`;

export interface CloseButtonProps {
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

const CloseButton: React.FC<CloseButtonProps> = ({ className, onClick }) => (
  <StyledCloseButton className={className} onClick={onClick}>
    <CloseIcon />
  </StyledCloseButton>
);

export { CloseButton };
