import React from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
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

  if (!selection) {
    return null;
  }

  return (
    <>
      <PredictionMobileActionContent>
        <PredictionMobileActionTitle>Prediction ticket ready</PredictionMobileActionTitle>
        <PredictionMobileActionMeta>
          Review the selected market and outcome from the trade rail.
        </PredictionMobileActionMeta>
      </PredictionMobileActionContent>
      <PredictionMobileActionButton type="button" onClick={onOpenTradeRail}>
        Open Ticket
      </PredictionMobileActionButton>
    </>
  );
};

export const PredictionMobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenTradeRail,
}) => {
  const router = useRouter();
  const selection = useSelector(selectPredictionSelection);

  const navItems = [
    { id: "sports", label: "Sports", href: "/sports/home", icon: Home },
    { id: "prediction", label: "Prediction", href: "/prediction", icon: LineChart },
    { id: "live", label: "Live", href: "/prediction/markets?status=live", icon: Activity },
    { id: "ticket", label: "Ticket", href: null, icon: Ticket },
    { id: "activity", label: "Activity", href: "/prediction/activity", icon: Wallet },
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
              <span>{item.label}</span>
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
