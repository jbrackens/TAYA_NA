import React from "react";
import { useRouter } from "next/router";
import { useTranslation } from "i18n";
import {
  Activity,
  BarChart3,
  Flame,
  Globe2,
  Landmark,
  LayoutGrid,
  Rocket,
  Trophy,
  Wallet,
} from "lucide-react";
import { predictionCategories } from "../../../lib/prediction-market-seed";
import {
  buildPredictionActivityPath,
  buildPredictionCategoryPath,
  buildPredictionMarketsPath,
} from "../../../lib/product-routing";
import {
  PredictionRail,
  PredictionRailIcon,
  PredictionRailItem,
  PredictionRailLabel,
  PredictionRailSection,
} from "./index.styled";

const primaryItems = [
  { id: "home", labelKey: "NAV_FEATURED", href: "/prediction", icon: Flame },
  {
    id: "live",
    labelKey: "LIVE_MARKETS",
    href: "/prediction/markets?status=live",
    icon: Activity,
  },
  {
    id: "all-markets",
    labelKey: "NAV_ALL_MARKETS",
    href: buildPredictionMarketsPath(),
    icon: LayoutGrid,
  },
  {
    id: "activity",
    labelKey: "NAV_MY_ACTIVITY",
    href: buildPredictionActivityPath(),
    icon: Wallet,
  },
];

const categoryIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  crypto: Rocket,
  politics: Landmark,
  macro: BarChart3,
  sports: Trophy,
  culture: Globe2,
  technology: Rocket,
};

export const PredictionLeftNav: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation(["prediction"]);
  const currentCategory = Array.isArray(router.query.categoryKey)
    ? router.query.categoryKey[0]
    : router.query.categoryKey;

  return (
    <PredictionRail>
      <PredictionRailSection>
        <PredictionRailLabel>{t("BROWSE")}</PredictionRailLabel>
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href.includes("?")
              ? router.asPath.startsWith(item.href.split("?")[0]) &&
                router.asPath.includes("status=live")
              : router.asPath === item.href || router.asPath.startsWith(`${item.href}/`);
          return (
            <PredictionRailItem
              key={item.id}
              type="button"
              $active={isActive}
              onClick={() => router.push(item.href)}
            >
              <PredictionRailIcon>
                <Icon size={16} />
              </PredictionRailIcon>
              {t(item.labelKey)}
            </PredictionRailItem>
          );
        })}
      </PredictionRailSection>
      <PredictionRailSection>
        <PredictionRailLabel>{t("CATEGORIES")}</PredictionRailLabel>
        {predictionCategories.map((category) => {
          const Icon = categoryIcons[category.key] || Rocket;
          return (
            <PredictionRailItem
              key={category.key}
              type="button"
              $active={currentCategory === category.key}
              onClick={() => router.push(buildPredictionCategoryPath(category.key))}
            >
              <PredictionRailIcon>
                <Icon size={16} />
              </PredictionRailIcon>
              {category.label}
            </PredictionRailItem>
          );
        })}
      </PredictionRailSection>
    </PredictionRail>
  );
};
