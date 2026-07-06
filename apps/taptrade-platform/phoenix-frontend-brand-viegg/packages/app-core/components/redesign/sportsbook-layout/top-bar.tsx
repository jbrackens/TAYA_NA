import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useTranslation } from "i18n";
import { showAuthModal, selectIsLoggedIn } from "../../../lib/slices/authSlice";
import { showCashierDrawer } from "../../../lib/slices/cashierSlice";
import { CurrentBalanceComponent } from "../../current-balance";
import { useLogout } from "../../../hooks/useLogout";
import { ModeToggle } from "../../layout/header/mode-toggle/ModeToggle";
import { LanguageSelectorComponent } from "../../layout/header/language-selector";
import {
  SportsbookActionButton,
  SportsbookBalancePill,
  SportsbookTopActions,
  SportsbookTopNav,
  SportsbookTopNavButton,
  SportsbookTopNavGroup,
} from "./index.styled";

const {
  PREDICTION_MARKETS_ENABLED,
} = require("next/config").default().publicRuntimeConfig;

const topLinks = [
  { id: "live", labelKey: "LIVE", href: "/sports/in-play" },
  { id: "promos", labelKey: "PROMOTIONS_LINK", href: "/promotions" },
  { id: "bets", labelKey: "MY_BETS", href: "/account/bet-history" },
];

export const SportsbookTopBarNav: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation(["header"]);

  return (
    <SportsbookTopNavGroup>
      <ModeToggle
        isPredictionEnabled={Boolean(Number(PREDICTION_MARKETS_ENABLED || 0))}
      />
      <SportsbookTopNav>
        {topLinks.map((item) => (
          <SportsbookTopNavButton
            key={item.id}
            type="button"
            $active={router.asPath.startsWith(item.href)}
            onClick={() => router.push(item.href)}
          >
            {t(item.labelKey)}
          </SportsbookTopNavButton>
        ))}
      </SportsbookTopNav>
    </SportsbookTopNavGroup>
  );
};

export const SportsbookTopBarActions: React.FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const { logOutAndRemoveToken } = useLogout();
  const { t } = useTranslation(["header"]);

  if (!isLoggedIn) {
    return (
      <SportsbookTopActions>
        <LanguageSelectorComponent source="header" />
        <SportsbookActionButton
          type="button"
          $accent
          onClick={() => dispatch(showAuthModal())}
        >
          {t("LOGIN_LINK")}
        </SportsbookActionButton>
      </SportsbookTopActions>
    );
  }

  return (
    <SportsbookTopActions>
      <LanguageSelectorComponent source="header" />
      <SportsbookBalancePill
        type="button"
        onClick={() => dispatch(showCashierDrawer())}
      >
        <CurrentBalanceComponent />
      </SportsbookBalancePill>
      <SportsbookActionButton
        type="button"
        onClick={() => router.push("/account")}
      >
        {t("ACCOUNT")}
      </SportsbookActionButton>
      <SportsbookActionButton type="button" onClick={logOutAndRemoveToken}>
        {t("LOGOUT_LINK")}
      </SportsbookActionButton>
    </SportsbookTopActions>
  );
};
