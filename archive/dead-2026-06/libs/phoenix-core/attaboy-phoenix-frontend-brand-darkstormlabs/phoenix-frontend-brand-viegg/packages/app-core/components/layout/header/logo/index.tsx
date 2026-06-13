import React from "react";
import { Logo as LogoStyled } from "./index.styles";

type LogoProps = {
  source: string;
  width?: number;
  height?: number;
};

type ComponentProps = {
  theme: LogoProps | undefined;
};

const Logo: React.FC<ComponentProps> = ({ theme }: ComponentProps) => {
  const { source } = theme || {};
  if (source) {
    return (
      <LogoStyled
        theme={{
          ...theme,
          unit: "px",
        }}
      >
        <img src={source} />
      </LogoStyled>
    );
  }
  return null;
};

export { Logo };
