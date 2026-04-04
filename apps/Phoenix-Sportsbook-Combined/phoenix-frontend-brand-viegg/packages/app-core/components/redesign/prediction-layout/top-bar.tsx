import React from "react";
import { useRouter } from "next/router";
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
  { id: "featured", label: "Featured", href: "/prediction" },
  { id: "live", label: "Live", href: "/prediction/markets?status=live" },
  { id: "markets", label: "All Markets", href: "/prediction/markets" },
  { id: "activity", label: "My Activity", href: "/prediction/activity" },
  { id: "account", label: "Account", href: "/account/transactions" },
];

export const PredictionTopBarNav: React.FC = () => {
  const router = useRouter();

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
              {item.label}
            </PredictionTopNavButton>
          );
        })}
      </PredictionTopNav>
    </PredictionTopNavGroup>
  );
};
