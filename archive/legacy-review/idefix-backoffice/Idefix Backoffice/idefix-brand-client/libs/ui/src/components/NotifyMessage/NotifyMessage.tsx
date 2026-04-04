import * as React from "react";
import styled from "styled-components";
import { WarningIcon } from "@brandserver-client/icons";

const StyledNotifyMessage = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 2px;
  color: ${({ theme }) => theme.palette.accentDark};
  fill: ${({ theme }) => theme.palette.accentDark};
  background: ${({ theme }) => theme.gradients.notificationMessage};

  ${({ theme }) => theme.typography.text12}

  &::before {
    position: absolute;
    content: "";
    width: 10px;
    height: 100%;
    border-radius: 2px 0 0 2px;
    background: ${({ theme }) => theme.palette.accent};
  }

  .notify-message__icon {
    width: 10px;
    height: 10px;
    margin-left: 15px;
  }

  .notify-message__text {
    margin-left: 5px;

    span {
      color: ${({ theme }) => theme.palette.accentLight};
      text-decoration: underline;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
    }
  }
`;

export interface NotifyMessageProps {
  children?: React.ReactElement | string;
  className?: string;
}

const NotifyMessage: React.FC<NotifyMessageProps> = ({
  className,
  children
}) => {
  return (
    <StyledNotifyMessage className={className}>
      <WarningIcon className="notify-message__icon" />
      <div className="notify-message__text">{children}</div>
    </StyledNotifyMessage>
  );
};

export { NotifyMessage };
