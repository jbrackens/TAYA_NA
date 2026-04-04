import React from "react";
import { MenuItemTitle, MenuItemStarContainer } from "../index.styled";
import { StarFilled, StarOutlined } from "@ant-design/icons";
import { AvatarComponent } from "../../../../avatar";

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
  // iconUrl,
  name,
  favSports,
  onStarClick,
  isCollapsed,
  noStar,
}) => {
  const handleStarClick = (e: React.MouseEvent) => onStarClick(id, e);

  return (
    <span style={{ display: "flex", width: "100%", alignItems: "center" }}>
      <AvatarComponent id={id} shape="square" type="sports" />
      <MenuItemTitle isCollapsed={isCollapsed} withoutIcon={true}>
        {/* remove split once backend updates cs go game name */}
        {name.split(":")[0]}
      </MenuItemTitle>
      {!noStar && (
        <MenuItemStarContainer>
          {favSports !== null && favSports.includes(id) ? (
            <StarFilled onClick={handleStarClick} />
          ) : (
            <StarOutlined onClick={handleStarClick} />
          )}
        </MenuItemStarContainer>
      )}
    </span>
  );
};

export { CustomMenuItem };
