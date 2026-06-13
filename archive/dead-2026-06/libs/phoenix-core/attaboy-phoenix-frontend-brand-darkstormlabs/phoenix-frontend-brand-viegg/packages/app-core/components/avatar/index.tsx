import React, { useEffect, useState, useContext } from "react";
import { Avatar } from "antd";
import { ThemeContext } from "styled-components";

const { CDN_URL } = require("next/config").default().publicRuntimeConfig;

type AvatarComponentProps = {
  id: string;
  size?: number | "small" | "large" | "default" | undefined;
  shape?: "circle" | "square" | undefined;
  type: string;
  className?: string;
};

const AvatarComponent: React.FC<AvatarComponentProps> = ({
  id,
  size,
  shape,
  type,
  className,
}) => {
  const [url, setUrl] = useState("");
  const theme = useContext(ThemeContext);
  const onError = () => {
    setUrl(`${CDN_URL}/images/${type}/default/icon.svg`);
    return true;
  };

  useEffect(() => {
    const formattedId = id.replace(/:/g, "_");

    setUrl(`${CDN_URL}/images/${type}/${formattedId}/icon.svg`);
  }, [id, size, type]);

  const generateAvatarUrl = () => {
    const sidebarTheme = theme.sidebar;
    const menuTheme = theme.menu;
    switch (id) {
      case "home": {
        return sidebarTheme.customHomeIcon;
      }

      case "inPlay": {
        return sidebarTheme.customInPlayLogo;
      }

      case "upcoming": {
        return sidebarTheme.customUpComingLogo;
      }

      case "rg": {
        return menuTheme.rgLogo;
      }

      default:
        return url;
    }
  };

  return (
    <Avatar
      className={className}
      size={size}
      shape={shape}
      src={generateAvatarUrl()}
      onError={onError}
    />
  );
};

export { AvatarComponent };
