import React from "react";

type LogoProps = {
  source?: string;
  width?: number;
  height?: number;
  unit?: string;
};

type ComponentProps = {
  theme: LogoProps | string | undefined;
};

const Logo: React.FC<ComponentProps> = ({ theme }: ComponentProps) => {
  const logoTheme =
    typeof theme === "object" && theme !== null ? theme : undefined;
  const { source, width, height, unit = "px" } = logoTheme || {};
  if (source) {
    const logoStyle = {
      "--office-logo-width": width ? `${width}${unit}` : "100%",
      "--office-logo-height": height ? `${height}${unit}` : "auto",
      "--office-logo-image-max-height": width ? `${width * 0.75}px` : "none",
    } as React.CSSProperties;

    return (
      <div
        className="mr-16 flex h-[var(--office-logo-height)] max-h-full w-[var(--office-logo-width)] items-center justify-center [&_img]:max-h-[var(--office-logo-image-max-height)]"
        style={logoStyle}
      >
        <img src={source} />
      </div>
    );
  }
  return null;
};

export { Logo };
