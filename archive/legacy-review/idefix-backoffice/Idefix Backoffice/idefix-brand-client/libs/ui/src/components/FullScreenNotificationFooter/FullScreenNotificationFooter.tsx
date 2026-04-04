import * as React from "react";
import styled from "styled-components";
import { useRegistry } from "../../useRegistry";

export const StyledFullScreenNotificationFooter = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.palette.ctaBackground};
  color: ${({ theme }) => theme.palette.contrast};
  height: 68px;
  display: flex;
  justify-content: center;
  align-items: center;

  h3 {
    ${({ theme }) => theme.typography.text18Bold};
  }

  .FullScreenNotificationFooter__button {
    width: fit-content;
    margin-left: 32px;
    background: ${({ theme }) => theme.palette.accent};
    color: ${({ theme }) => theme.palette.contrast};
    text-transform: uppercase;
  }

  @media only screen and (max-width: 768px) {
    display: none;
  }
`;

export interface FullScreenNotificationFooterProps {
  title: string;
  actionText: string;
  onClick: () => void;
}

export const FullScreenNotificationFooter: React.FC<
  FullScreenNotificationFooterProps
> = ({ title, actionText, onClick }) => {
  const { Button } = useRegistry();

  return (
    <StyledFullScreenNotificationFooter>
      <h3>{title}</h3>
      <Button
        onClick={onClick}
        className="FullScreenNotificationFooter__button"
      >
        {actionText}
      </Button>
    </StyledFullScreenNotificationFooter>
  );
};
