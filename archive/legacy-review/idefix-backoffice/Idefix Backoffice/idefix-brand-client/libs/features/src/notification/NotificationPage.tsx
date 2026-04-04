import * as React from "react";
import { Notification as NotificationType } from "@brandserver-client/types";
import { MyAccountPage } from "@brandserver-client/lobby";
import { redirect } from "@brandserver-client/utils";
import { withInitialProps } from "../with-initial-props";
import { Notification } from "./Notification";

interface IProps {
  data: NotificationType | undefined;
  isLoading: boolean;
}

const NotificationPage: MyAccountPage<IProps, NotificationType> = ({
  data,
  isLoading
}) => <Notification notification={data!} isLoading={isLoading} />;

NotificationPage.fetchInitialProps = async ctx => {
  const {
    lobby: { api },
    query
  } = ctx;

  try {
    const notification = await api.notifications.getNotification(
      query?.notificationId as string
    );

    if (!notification) {
      throw new Error("Notification not found");
    }

    return notification;
  } catch (err) {
    redirect(ctx, "/loggedin/myaccount/inbox");
  }
};

export default withInitialProps(NotificationPage);
