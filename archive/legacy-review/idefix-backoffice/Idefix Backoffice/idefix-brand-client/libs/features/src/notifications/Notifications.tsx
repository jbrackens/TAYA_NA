import * as React from "react";
import styled from "styled-components";
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import { EmptyNotification } from "@brandserver-client/icons";
import { Notification as NotificationType } from "@brandserver-client/types";
import Notification from "./Notification";
import { useMessages } from "@brandserver-client/hooks";

interface Props {
  isLoading: boolean;
  notifications?: NotificationType[] | undefined;
}

const StyledNotificationBadge = styled.div`
  position: absolute;
  top: -20px;
  right: -20px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: ${({ theme }) => theme.palette.contrast};
  background: ${({ theme }) => theme.palette.accent};
  ${({ theme }) => theme.typography.text18Bold};
`;

const StyledNotifications = styled.div`
  .notifications {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .notifications__title {
    color: ${({ theme }) => theme.palette.primary};
    ${({ theme }) => theme.typography.text21BoldUpper};

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      ${({ theme }) => theme.typography.text24Bold};
    }
  }

  .notifications__list {
    margin-top: 32px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-bottom: 28px;
    }
  }

  .notifications__empty {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 250px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      min-height: calc(100vh - 200px);
      margin-top: 0px;
    }
  }

  .notifications__empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .notifications__empty-image-block {
    position: relative;
    margin-bottom: 31px;
    svg {
      width: 128px;
      height: 92px;
    }
  }

  .notifications__empty-title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.primary};
  }

  .notification-wrapper {
    margin-bottom: 27px;
  }
`;

const Notifications: React.FC<Props> = ({ notifications, isLoading }) => {
  const { Loader } = useRegistry();
  const messages = useMessages({
    noNotifications: "my-account.inbox.no-active-notifications",
    yourNotifications: "my-account.inbox.your-notifications"
  });

  if (!notifications || isLoading) {
    return <Loader />;
  }

  const isEmpty = notifications && notifications.length === 0;

  if (isEmpty) {
    return (
      <StyledNotifications>
        <div className="notifications__empty">
          <div className="notifications__empty-content">
            <div className="notifications__empty-image-block">
              <EmptyNotification />
              <StyledNotificationBadge>0</StyledNotificationBadge>
            </div>

            <div className="notifications__empty-title">
              {messages.noNotifications}
            </div>
          </div>
        </div>
      </StyledNotifications>
    );
  }

  return (
    <StyledNotifications>
      <div className="notifications">
        <div className="notifications__title">{messages.yourNotifications}</div>
        <ul className="notifications__list">
          {notifications.map(notification => (
            <div className="notification-wrapper" key={notification.id}>
              <Notification key={notification.id} {...notification} />
            </div>
          ))}
        </ul>
      </div>
    </StyledNotifications>
  );
};

export default Notifications;
