import React from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { Clock3, Home, Megaphone, Trophy } from "lucide-react";
import { selectSports } from "../../../lib/slices/sportSlice";
import { dedupeSportLikeItems } from "../../../lib/sports-routing";
import {
  SportsbookRail,
  SportsbookRailIcon,
  SportsbookRailItem,
  SportsbookRailLabel,
  SportsbookRailSection,
} from "./index.styled";

const primaryItems = [
  { id: "home", label: "Home", href: "/sports/home", icon: Home },
  { id: "live", label: "In-Play", href: "/sports/in-play", icon: Clock3 },
  { id: "promotions", label: "Promotions", href: "/promotions", icon: Megaphone },
];

export const SportsbookLeftNav: React.FC = () => {
  const router = useRouter();
  const sports = useSelector(selectSports);
  const visibleSports = dedupeSportLikeItems(
    sports.filter((sport) => sport.displayToPunters !== false),
  );

  return (
    <SportsbookRail>
      <SportsbookRailSection>
        <SportsbookRailLabel>Browse</SportsbookRailLabel>
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <SportsbookRailItem
              key={item.id}
              type="button"
              $active={router.asPath.startsWith(item.href)}
              onClick={() => router.push(item.href)}
            >
              <SportsbookRailIcon>
                <Icon size={16} />
              </SportsbookRailIcon>
              {item.label}
            </SportsbookRailItem>
          );
        })}
      </SportsbookRailSection>
      <SportsbookRailSection>
        <SportsbookRailLabel>Sports</SportsbookRailLabel>
        {visibleSports.map((sport) => (
          <SportsbookRailItem
            key={sport.abbreviation}
            type="button"
            $active={router.asPath.startsWith(`/sports/${sport.abbreviation}`)}
            onClick={() => router.push(`/sports/${sport.abbreviation}`)}
          >
            <SportsbookRailIcon>
              <Trophy size={16} />
            </SportsbookRailIcon>
            {sport.name.split(":")[0]}
          </SportsbookRailItem>
        ))}
      </SportsbookRailSection>
    </SportsbookRail>
  );
};
