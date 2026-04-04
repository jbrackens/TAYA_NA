import * as React from "react";
import { useRegistry } from "@brandserver-client/ui";
import { redirect } from "@brandserver-client/utils";
import { NotificationMessage } from "../notification";
import { LobbyState, LobbyNextContext } from "../lobby";
import { Notification } from "@brandserver-client/types";

interface IProps {
  notification: Notification;
}

const Inbox = ({ notification }: IProps) => {
  const { FullScreenModal } = useRegistry();

  return (
    <FullScreenModal>
      <NotificationMessage notification={notification} />
    </FullScreenModal>
  );
};

Inbox.getInitialProps = async (ctx: LobbyNextContext<LobbyState>) => {
  const {
    lobby: { api },
    query: { notificationId }
  } = ctx;

  try {
    const notification = await api.notifications.getNotification(
      notificationId as string
    );

    if (!notification) {
      throw new Error("Notification not found");
    }

    return { notification };
  } catch (error) {
    return redirect(ctx, "/loggedin");
  }
};

export { Inbox };
