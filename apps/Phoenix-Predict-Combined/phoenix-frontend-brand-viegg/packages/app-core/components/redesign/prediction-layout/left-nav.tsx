import React from "react";
import { useRouter } from "next/router";
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
  { id: "home", label: "Featured", href: "/prediction", icon: Flame },
  {
    id: "live",
    label: "Live Markets",
    href: "/prediction/markets?status=live",
    icon: Activity,
  },
  {
    id: "all-markets",
    label: "All Markets",
    href: buildPredictionMarketsPath(),
    icon: LayoutGrid,
  },
  {
    id: "activity",
    label: "My Activity",
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
  const currentCategory = Array.isArray(router.query.categoryKey)
    ? router.query.categoryKey[0]
    : router.query.categoryKey;

  return (
    <PredictionRail>
      <PredictionRailSection>
        <PredictionRailLabel>Browse</PredictionRailLabel>
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
              {item.label}
            </PredictionRailItem>
          );
        })}
      </PredictionRailSection>
      <PredictionRailSection>
        <PredictionRailLabel>Categories</PredictionRailLabel>
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
