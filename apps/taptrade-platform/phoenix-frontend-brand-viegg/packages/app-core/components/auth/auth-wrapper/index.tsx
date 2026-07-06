import React, { ReactNode } from "react";
import Router from "next/router";

enum SecureRoutes {
  Account = "/account",
  AccountSettings = "/account/settings",
  AccountNotifications = "/account/notifications",
  AccountLimits = "/account/responsible-gaming",
  AccountSecurity = "/account/security",
  AccountTransactions = "/account/transactions",
  AccountBetHistory = "/account/bet-history",
  AccountRgHistory = "/account/rg-history",
  AccountSelfExclude = "/account/responsible-gaming/self-exclude",
  TransactionHistory = "/transaction-history",
  WinLossStatistics = "/win-loss-statistics",
}

type AuthWrapperProps = {
  children: ReactNode;
  isLoggedIn: boolean;
};

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children, isLoggedIn }) => {
  const { router, push } = Router;

  const redirectCondition =
    router?.route &&
    Object.values(SecureRoutes).includes(router.route as any) &&
    !isLoggedIn;

  if (redirectCondition) {
    push("/sports/home");
  }

  return <>{redirectCondition ? <></> : <>{children}</>}</>;
};

export { AuthWrapper };
