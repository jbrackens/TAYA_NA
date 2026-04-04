import * as React from "react";
import Link from "next/link";
import styled from "styled-components";
import { Notification as NotificationType } from "@brandserver-client/types";

const StyledNotification = styled.li`
  display: flex;
  align-items: center;
  position: relative;
  margin-left: 28px;

  &::before {
    content: "";
    position: absolute;
    left: -24px;
    top: 6px;
    width: 12px;
    height: 12px;
    margin-right: 16px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.palette.accent};
  }

  .notification__content {
    width: 100%;
  }

  .notification__title {
    color: ${({ theme }) => theme.palette.contrastLight};
    ${({ theme }) => theme.typography.text18Bold};
  }

  .notification__extract {
    color: ${({ theme }) => theme.palette.contrastDark};
    ${({ theme }) => theme.typography.text16};
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
`;

const Notification: React.FC<NotificationType> = ({ id, title, extract }) => (
  <StyledNotification>
    <div className="notification__content">
      <Link
        href={{
          pathname: "/loggedin/myaccount/inbox/[notificationId]",
          query: { notificationId: id }
        }}
      >
        <a>
          <div className="notification__title">{title}</div>
          <div className="notification__extract">{extract}</div>
        </a>
      </Link>
    </div>
  </StyledNotification>
);

export default Notification;
