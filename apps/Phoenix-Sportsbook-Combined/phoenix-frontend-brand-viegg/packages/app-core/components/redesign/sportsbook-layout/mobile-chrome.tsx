import React from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { Clock3, Home, LineChart, Ticket, User } from "lucide-react";
import { BottomNavItem } from "../app-shell";
import {
  selectBets,
  selectSummaryValues,
} from "../../../lib/slices/betSlice";
import { useCurrency } from "../../../services/currency";
import {
  SportsbookBottomNavBadge,
  SportsbookBottomNavItemContent,
  SportsbookMobileActionButton,
  SportsbookMobileActionContent,
  SportsbookMobileActionMeta,
  SportsbookMobileActionTitle,
} from "./index.styled";

type MobileActionBarProps = {
  onOpenBetslip: () => void;
};

type MobileBottomNavProps = {
  onOpenBetslip: () => void;
};

export const SportsbookMobileActionBar: React.FC<MobileActionBarProps> = ({
  onOpenBetslip,
}) => {
  const bets = useSelector(selectBets);
  const summaryValues = useSelector(selectSummaryValues);
  const { formatCurrencyValue } = useCurrency();

  if (!bets.length) {
    return null;
  }

  return (
    <>
      <SportsbookMobileActionContent>
        <SportsbookMobileActionTitle>
          {bets.length} selection{bets.length === 1 ? "" : "s"} ready
        </SportsbookMobileActionTitle>
        <SportsbookMobileActionMeta>
          Potential return {formatCurrencyValue(summaryValues.possibleReturn || 0)}
        </SportsbookMobileActionMeta>
      </SportsbookMobileActionContent>
      <SportsbookMobileActionButton type="button" onClick={onOpenBetslip}>
        Open Betslip
      </SportsbookMobileActionButton>
    </>
  );
};

export const SportsbookMobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenBetslip,
}) => {
  const router = useRouter();
  const bets = useSelector(selectBets);

  const navItems = [
    { id: "sports", label: "Sports", href: "/sports/home", icon: Home },
    { id: "prediction", label: "Prediction", href: "/prediction", icon: LineChart },
    { id: "live", label: "Live", href: "/sports/in-play", icon: Clock3 },
    { id: "betslip", label: "Betslip", href: null, icon: Ticket },
    { id: "account", label: "Account", href: "/account", icon: User },
  ] as const;

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href ? router.asPath.startsWith(item.href) : false;
        const handleClick = () => {
          if (item.id === "betslip") {
            onOpenBetslip();
            return;
          }
          if (item.href) {
            router.push(item.href);
          }
        };

        return (
          <BottomNavItem
            key={item.id}
            type="button"
            $active={isActive}
            onClick={handleClick}
          >
            <SportsbookBottomNavItemContent>
              <Icon size={16} />
              <span>{item.label}</span>
              {item.id === "betslip" && bets.length > 0 ? (
                <SportsbookBottomNavBadge>{bets.length}</SportsbookBottomNavBadge>
              ) : null}
            </SportsbookBottomNavItemContent>
          </BottomNavItem>
        );
      })}
    </>
  );
};
