import React from "react";
import { MenuItemTitle, MenuItemStarContainer } from "../index.styled";
import { StarFilled, StarOutlined } from "@ant-design/icons";
import {
  Bell,
  Calendar,
  Clock3,
  Home,
  Settings,
  Shield,
  Trophy,
  User,
  Wallet,
  History,
} from "lucide-react";

type CustomMenuItemProps = {
  id: string;
  iconUrl?: string;
  name: string;
  favSports: null | Array<string>;
  onStarClick: (id: string, e: React.MouseEvent) => void;
  isCollapsed: boolean;
  noStar?: boolean;
};

const CustomMenuItem: React.FC<CustomMenuItemProps> = ({
  id,
  name,
  favSports,
  onStarClick,
  isCollapsed,
  noStar,
}) => {
  const handleStarClick = (e: React.MouseEvent) => onStarClick(id, e);

  const resolveMenuIcon = () => {
    if (!noStar) {
      return Trophy;
    }

    switch (id) {
      case "home":
        return Home;
      case "inPlay":
        return Clock3;
      case "upcoming":
        return Calendar;
      case "account":
        return User;
      case "notifications":
        return Bell;
      case "settings":
        return Settings;
      case "limits":
      case "security":
      case "rg":
        return Shield;
      case "transactions":
        return Wallet;
      case "bet-history":
      case "rg-history":
        return History;
      default:
        return Trophy;
    }
  };

  const Icon = resolveMenuIcon();

  return (
    <span
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        minHeight: 34,
        padding: "0 12px",
        gap: 2,
      }}
    >
      <Icon size={16} />
      <MenuItemTitle isCollapsed={isCollapsed} withoutIcon={true}>
        {/* remove split once backend updates cs go game name */}
        {name.split(":")[0]}
      </MenuItemTitle>
      {!noStar && (
        <MenuItemStarContainer>
          {favSports !== null && favSports.includes(id) ? (
            <StarFilled
              onClick={handleStarClick}
              style={{ color: "var(--sb-accent-gold)" }}
            />
          ) : (
            <StarOutlined
              onClick={handleStarClick}
              style={{ color: "var(--sb-text-tertiary)" }}
            />
          )}
        </MenuItemStarContainer>
      )}
    </span>
  );
};

export { CustomMenuItem };
