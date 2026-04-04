import * as React from "react";
import styled from "styled-components";
import { Notification as NotificationType } from "@brandserver-client/types";
import { NotificationMessage } from "@brandserver-client/lobby";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { ChevronRightIcon } from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";
import { useRouter } from "next/router";

const StyledNotification = styled.div`
  padding: 9px 20px;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    padding: 0px 4px;
  }

  .notif-tab__nav {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .notif-tab__button {
    margin-right: 15px;
    transform: rotate(180deg);
    background: rgba(214, 217, 223, 0.3);
    border-radius: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;

    svg {
      fill: ${({ theme }) => theme.palette.contrastDark};
      width: 16px;
      height: 16px;
    }
  }

  .notif-tab__text {
    font-size: 18px;
    line-height: 27px;
    color: ${({ theme }) => theme.palette.contrastDark};
  }
`;

interface Props {
  isLoading: boolean;
  notification: NotificationType;
}

const Notification: React.FC<Props> = ({ notification, isLoading }) => {
  const router = useRouter();

  const messages = useMessages({
    allMessages: "my-account.inbox.all-messages"
  });

  const { Loader } = useRegistry();

  const handleBack = React.useCallback(
    () => router.push("/loggedin/myaccount/inbox"),
    []
  );

  if (isLoading || !notification) {
    return <Loader />;
  }

  return (
    <StyledNotification>
      <div className="notif-tab__nav" onClick={handleBack}>
        <div className="notif-tab__button">
          <ChevronRightIcon />
        </div>
        <div className="notif-tab__text">{messages.allMessages}</div>
      </div>
      <NotificationMessage notification={notification} isMyAccount />
    </StyledNotification>
  );
};

export { Notification };
