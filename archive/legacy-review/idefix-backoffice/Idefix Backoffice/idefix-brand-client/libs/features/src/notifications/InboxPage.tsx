import * as React from "react";
import { Notification } from "@brandserver-client/types";
import { MyAccountPage } from "@brandserver-client/lobby";
import { withInitialProps } from "../with-initial-props";
import Notifications from "./Notifications";

interface IProps {
  data: Notification[] | undefined;
  isLoading: boolean;
}

const InboxPage: MyAccountPage<IProps, Notification[]> = ({
  data,
  isLoading
}) => {
  return <Notifications notifications={data} isLoading={isLoading} />;
};

InboxPage.fetchInitialProps = async ctx => {
  const {
    lobby: { api }
  } = ctx;

  const notifications = await api.notifications.getNotifications();
  return notifications;
};

export default withInitialProps(InboxPage);
