import React from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useTranslation } from "i18n";
import { Activity, Home, LineChart, Ticket, Wallet } from "lucide-react";
import { BottomNavItem } from "../app-shell";
import {
  selectPredictionSelection,
} from "../../../lib/slices/predictionSlice";
import {
  PredictionBottomNavBadge,
  PredictionBottomNavItemContent,
  PredictionMobileActionButton,
  PredictionMobileActionContent,
  PredictionMobileActionMeta,
  PredictionMobileActionTitle,
} from "./index.styled";

type MobileActionBarProps = {
  onOpenTradeRail: () => void;
};

type MobileBottomNavProps = {
  onOpenTradeRail: () => void;
};

export const PredictionMobileActionBar: React.FC<MobileActionBarProps> = ({
  onOpenTradeRail,
}) => {
  const selection = useSelector(selectPredictionSelection);
  const { t } = useTranslation(["prediction"]);

  if (!selection) {
    return null;
  }

  return (
    <>
      <PredictionMobileActionContent>
        <PredictionMobileActionTitle>{t("MOBILE_TICKET_READY")}</PredictionMobileActionTitle>
        <PredictionMobileActionMeta>
          {t("MOBILE_TICKET_READY_COPY")}
        </PredictionMobileActionMeta>
      </PredictionMobileActionContent>
      <PredictionMobileActionButton type="button" onClick={onOpenTradeRail}>
        {t("OPEN_TICKET")}
      </PredictionMobileActionButton>
    </>
  );
};

export const PredictionMobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenTradeRail,
}) => {
  const router = useRouter();
  const selection = useSelector(selectPredictionSelection);
  const { t } = useTranslation(["prediction"]);

  const navItems = [
    { id: "sports", labelKey: "MOBILE_NAV_SPORTS", href: "/sports/home", icon: Home },
    { id: "prediction", labelKey: "MOBILE_NAV_PREDICTION", href: "/prediction", icon: LineChart },
    { id: "live", labelKey: "NAV_LIVE", href: "/prediction/markets?status=live", icon: Activity },
    { id: "ticket", labelKey: "MOBILE_NAV_TICKET", href: null, icon: Ticket },
    { id: "activity", labelKey: "MOBILE_NAV_ACTIVITY", href: "/prediction/activity", icon: Wallet },
  ] as const;

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href
          ? item.href.includes("?")
            ? router.asPath.startsWith(item.href.split("?")[0]) && router.asPath.includes("status=live")
            : router.asPath.startsWith(item.href)
          : false;

        return (
          <BottomNavItem
            key={item.id}
            type="button"
            $active={isActive}
            onClick={() => {
              if (item.id === "ticket") {
                onOpenTradeRail();
                return;
              }
              if (item.href) {
                router.push(item.href);
              }
            }}
          >
            <PredictionBottomNavItemContent>
              <Icon size={16} />
              <span>{t(item.labelKey)}</span>
              {item.id === "ticket" && selection ? (
                <PredictionBottomNavBadge>1</PredictionBottomNavBadge>
              ) : null}
            </PredictionBottomNavItemContent>
          </BottomNavItem>
        );
      })}
    </>
  );
};
