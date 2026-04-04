import * as React from "react";
import { useSelector } from "react-redux";
import { getUpdate, MyAccountLink } from "@brandserver-client/lobby";
import {
  PendingWithdrawalIcon,
  WithdrawIcon,
  HistoryIcon,
  UserIcon,
  LogoutIcon,
  MessagesIcon,
  GiftIcon
} from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";

export function useMyAccountLinks() {
  const {
    pendingWithdraws,
    notificationCount,
    details: { rewardsCount: bonusCount }
  } = useSelector(getUpdate);

  const messages = useMessages({
    withdraw: "my-account.cashier.withdraw",
    pending: "my-account.cashier.pending",
    inbox: "my-account.notifications.inbox",
    bonuses: "my-account.rewards",
    history: "my-account.cashier.history",
    profile: "my-account.my-profile",
    logout: "loggedin.logout"
  });

  const myAccountLinks: MyAccountLink[] = React.useMemo(
    () => [
      {
        Icon: PendingWithdrawalIcon,
        href: "/loggedin/myaccount/withdraw-pending",
        badge: pendingWithdraws,
        text: messages.pending
      },
      {
        Icon: MessagesIcon,
        href: "/loggedin/myaccount/inbox",
        text: messages.inbox,
        badge: notificationCount
      },
      {
        Icon: GiftIcon,
        href: "/loggedin/myaccount/bonuses",
        text: messages.bonuses,
        badge: bonusCount
      },
      {
        Icon: WithdrawIcon,
        href: "/loggedin/myaccount/withdraw",
        text: messages.withdraw
      },
      {
        Icon: HistoryIcon,
        href: "/loggedin/myaccount/history",
        text: messages.history
      },
      {
        Icon: UserIcon,
        href: "/loggedin/myaccount/profile",
        text: messages.profile
      },
      {
        Icon: LogoutIcon,
        href: "/logout",
        text: messages.logout,
        className: "myaccount-sidebar__logout-link--vb"
      }
    ],
    [pendingWithdraws, notificationCount, messages]
  );

  return myAccountLinks;
}
