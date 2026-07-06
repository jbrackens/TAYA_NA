import React from "react";
import { useRouter } from "next/router";
import { useTranslation } from "i18n";
import { ModeToggle } from "../../layout/header/mode-toggle/ModeToggle";
import {
  PredictionTopNav,
  PredictionTopNavButton,
  PredictionTopNavGroup,
} from "./index.styled";

const {
  PREDICTION_MARKETS_ENABLED,
} = require("next/config").default().publicRuntimeConfig;

const predictionLinks = [
  { id: "featured", labelKey: "NAV_FEATURED", href: "/prediction" },
  { id: "live", labelKey: "NAV_LIVE", href: "/prediction/markets?status=live" },
  { id: "markets", labelKey: "NAV_ALL_MARKETS", href: "/prediction/markets" },
  { id: "activity", labelKey: "NAV_MY_ACTIVITY", href: "/prediction/activity" },
  { id: "account", labelKey: "NAV_ACCOUNT", href: "/account/transactions" },
];

export const PredictionTopBarNav: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation(["prediction"]);

  return (
    <PredictionTopNavGroup>
      <ModeToggle
        isPredictionEnabled={Boolean(Number(PREDICTION_MARKETS_ENABLED || 0))}
      />
      <PredictionTopNav>
        {predictionLinks.map((item) => {
          const isActive =
            item.href.includes("?")
              ? router.asPath.startsWith(item.href.split("?")[0]) &&
                router.asPath.includes("status=live")
              : router.asPath.startsWith(item.href);
          return (
            <PredictionTopNavButton
              key={item.id}
              type="button"
              $active={isActive}
              onClick={() => router.push(item.href)}
            >
              {t(item.labelKey)}
            </PredictionTopNavButton>
          );
        })}
      </PredictionTopNav>
    </PredictionTopNavGroup>
  );
};
