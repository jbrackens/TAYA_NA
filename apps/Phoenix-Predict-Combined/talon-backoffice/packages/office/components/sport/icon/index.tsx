import React, { useState, useEffect } from "react";
import { SportIconStyled } from "./index.styled";

const { CDN_URL } = require("next/config").default().publicRuntimeConfig;

export type SportIconProps = {
  src: string;
};

const SportIcon = ({ src }: SportIconProps) => {
  const [showDefault, setShowDefault] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (showDefault) {
      setUrl(`${CDN_URL}/images/sports/default/icon.svg`);
      return;
    }

    setUrl(src);
  }, [showDefault]);

  const onError = () => {
    if (!showDefault) {
      setShowDefault(true);
    }
  };

  return (
    <SportIconStyled>
      <img src={url} onError={onError} />
    </SportIconStyled>
  );
};

export default SportIcon;
