import {
  MenuWithdraw,
  MenuPending,
  MenuHistory,
  MenuProfile,
  MenuSupport,
  MenuRewards
} from "@brandserver-client/icons";

export const mobileMenuLinks = [
  {
    id: "pending",
    Icon: MenuPending,
    locale: "my-account.cashier.pending",
    href: "/loggedin/myaccount/withdraw-pending",
    as: "/loggedin/myaccount/withdraw-pending"
  },
  {
    id: "profile",
    Icon: MenuProfile,
    locale: "my-account.my-profile",
    href: "/loggedin/myaccount/profile",
    as: "/loggedin/myaccount/profile"
  },
  {
    id: "withdraw",
    Icon: MenuWithdraw,
    locale: "my-account.cashier.withdraw",
    href: "/loggedin/myaccount/withdraw",
    as: "/loggedin/myaccount/withdraw"
  },
  {
    id: "history",
    Icon: MenuHistory,
    locale: "my-account.cashier.history",
    href: "/loggedin/myaccount/history",
    as: "/loggedin/myaccount/history"
  },
  {
    id: "bonuses",
    Icon: MenuRewards,
    locale: "my-account.rewards",
    href: "/loggedin/myaccount/bonuses",
    as: "/loggedin/myaccount/bonuses"
  },
  {
    id: "support",
    Icon: MenuSupport,
    locale: "navigation.support",
    href: "/loggedin",
    onClick: () => {
      if ((window as any).chatButton) {
        (window as any).chatButton.onClick();
      }
    }
  }
];
