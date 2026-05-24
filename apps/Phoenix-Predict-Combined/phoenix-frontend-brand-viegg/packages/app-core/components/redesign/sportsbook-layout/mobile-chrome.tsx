import React from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useTranslation } from "i18n";
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
  const { t } = useTranslation(["betslip"]);

  if (!bets.length) {
    return null;
  }

  return (
    <>
      <SportsbookMobileActionContent>
        <SportsbookMobileActionTitle>
          {t("SELECTIONS_READY", { count: bets.length })}
        </SportsbookMobileActionTitle>
        <SportsbookMobileActionMeta>
          {t("POTENTIAL_RETURN", {
            value: formatCurrencyValue(summaryValues.possibleReturn || 0),
          })}
        </SportsbookMobileActionMeta>
      </SportsbookMobileActionContent>
      <SportsbookMobileActionButton type="button" onClick={onOpenBetslip}>
        {t("OPEN_BETSLIP")}
      </SportsbookMobileActionButton>
    </>
  );
};

export const SportsbookMobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenBetslip,
}) => {
  const router = useRouter();
  const bets = useSelector(selectBets);
  const { t } = useTranslation(["header", "betslip"]);

  const navItems = [
    { id: "sports", labelKey: "SPORTS", href: "/sports/home", icon: Home },
    { id: "prediction", labelKey: "PREDICTION", href: "/prediction", icon: LineChart },
    { id: "live", labelKey: "LIVE", href: "/sports/in-play", icon: Clock3 },
    { id: "betslip", labelKey: "betslip:BETSLIP", href: null, icon: Ticket },
    { id: "account", labelKey: "ACCOUNT", href: "/account", icon: User },
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
              <span>{t(item.labelKey)}</span>
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
