import React from "react";
import Link from "next/link";
import { AnchorWithNoDefaultStyle } from "./index.styled";

type LinkWrapperProps = {
  href: string;
  style?: React.CSSProperties;
};

export const LinkWrapper: React.FC<LinkWrapperProps> = ({
  href,
  children,
  style,
}) => {
  return (
    <Link href={href} passHref>
      <AnchorWithNoDefaultStyle style={style}>
        {children}
      </AnchorWithNoDefaultStyle>
    </Link>
  );
};
