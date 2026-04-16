import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { showAuthModal, selectIsLoggedIn } from "../../../lib/slices/authSlice";
import { showCashierDrawer } from "../../../lib/slices/cashierSlice";
import { CurrentBalanceComponent } from "../../current-balance";
import { useLogout } from "../../../hooks/useLogout";
import { ModeToggle } from "../../layout/header/mode-toggle/ModeToggle";
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
  { id: "live", label: "Live", href: "/sports/in-play" },
  { id: "promos", label: "Promotions", href: "/promotions" },
  { id: "bets", label: "My Bets", href: "/account/bet-history" },
];

export const SportsbookTopBarNav: React.FC = () => {
  const router = useRouter();

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
            {item.label}
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

  if (!isLoggedIn) {
    return (
      <SportsbookTopActions>
        <SportsbookActionButton
          type="button"
          $accent
          onClick={() => dispatch(showAuthModal())}
        >
          Login
        </SportsbookActionButton>
      </SportsbookTopActions>
    );
  }

  return (
    <SportsbookTopActions>
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
        Account
      </SportsbookActionButton>
      <SportsbookActionButton type="button" onClick={logOutAndRemoveToken}>
        Logout
      </SportsbookActionButton>
    </SportsbookTopActions>
  );
};
