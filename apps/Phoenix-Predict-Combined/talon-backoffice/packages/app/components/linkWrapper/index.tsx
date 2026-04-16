import React from "react";
import Link from "next/link";
import { AnchorWithNoDefaultStyle } from "./index.styled";

type LinkWrapperProps = {
  href: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export const LinkWrapper: React.FC<LinkWrapperProps> = ({
  href,
  children,
  style,
}) => {
  return (
    <Link href={href} passHref legacyBehavior>
      <AnchorWithNoDefaultStyle style={style}>
        {children}
      </AnchorWithNoDefaultStyle>
    </Link>
  );
};
