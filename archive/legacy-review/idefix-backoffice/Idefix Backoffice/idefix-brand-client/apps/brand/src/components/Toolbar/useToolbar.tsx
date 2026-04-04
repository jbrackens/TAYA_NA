import * as React from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useTheme } from "styled-components";
import { getDepositIcon } from "@brandserver-client/utils";
import { useIsLoggedIn, useMessages } from "@brandserver-client/hooks";
import {
  getPlayer,
  getGameState,
  getBadgeCount,
  getJurisdiction,
  getCategories,
  getActiveCategory,
  getNotificationCount
} from "@brandserver-client/lobby";

function initializeSelectedTab(activeCategory: string, pathname: string) {
  if (pathname === "/games" || pathname === "/loggedin") {
    return activeCategory;
  }

  if (
    pathname === "/sports/betby" ||
    pathname === "/loggedin/sports/[gameId]"
  ) {
    return "sports";
  }

  if (pathname.includes("deposit")) {
    return "deposit";
  }

  return undefined;
}

export default function useToolbar() {
  const theme = useTheme();
  const {
    pathname,
    query: { lang: locale }
  } = useRouter();

  const isLoggedIn = useIsLoggedIn();
  const badgeCount = useSelector(getBadgeCount);
  const { CurrencyISO } = useSelector(getPlayer);
  const jurisdiction = useSelector(getJurisdiction);
  const { startGameOptions } = useSelector(getGameState);
  const notificationCount = useSelector(getNotificationCount);
  const gameCategories = useSelector(getCategories);
  const activeCategory = useSelector(getActiveCategory);

  const [selectedTab, setSelectedTab] = React.useState<string>(() =>
    initializeSelectedTab(activeCategory, pathname)
  );

  const getCategoryByName = React.useCallback(
    (categoryName: string) =>
      gameCategories.find(
        category => category.name.toLowerCase() === categoryName.toLowerCase()
      ),
    [gameCategories]
  );

  const isPanicButton = React.useMemo(
    () => jurisdiction === "GNRS" && !!startGameOptions,
    [jurisdiction, startGameOptions]
  );
  const badge = React.useMemo(
    () => badgeCount - notificationCount,
    [badgeCount, notificationCount]
  );
  const DepositIcon = React.useMemo(
    () => getDepositIcon(CurrencyISO),
    [CurrencyISO]
  );

  const messages = useMessages({
    panic: "my-account.24h-pause",
    other: "game.category.others",
    deposit: "loggedin.deposit",
    mybets: "game.category.mobile.MyBets",
    sports: "game.category.mobile.Sports",
    slots: "game.category.mobile.VideoSlot",
    esports: "game.category.mobile.Esports",
    live: "game.category.mobile.Live",
    login: "login.action",
    inbox: "my-account.notifications.inbox"
  });

  return {
    badge,
    locale,
    selectedTab,
    isLoggedIn,
    isPanicButton,
    messages,
    notificationCount,
    getCategoryByName,
    DepositIcon: <DepositIcon fill={theme.palette.accent2} />,
    handleSelectTab: setSelectedTab
  };
}
